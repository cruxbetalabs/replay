'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { VideoIndex } from '../lib/key-moments';
import { getReplayCloudEventsUrl, ReplayCloudError } from '../lib/replay-cloud/client';
import { isReplayCloudEnabled } from '../lib/replay-cloud/config';
import {
    bootstrapReplayCloudClient,
    completeCloudJob,
    createCloudJob,
    deleteCloudJob,
    getCloudJob,
    getCloudJobAssets,
    listCloudJobs,
    uploadFileToPresignedUrl,
} from '../lib/replay-cloud/jobs';
import { probeCloudVideoFile } from '../lib/replay-cloud/probe-video';
import { downloadUrlWithProgress, triggerBlobDownload, type DownloadProgress } from '../lib/download-with-progress';
import type { ActiveCloudUpload, CloudJobSummary, CloudUploadPhase } from '../lib/replay-cloud/types';

export interface LoadCloudJobHandlers {
    clearVideoDimensions: (videoIndex: VideoIndex) => void;
    replaceVideoSource: (videoIndex: VideoIndex, file: File, nextUrl?: string) => void;
    handleTrajectoryFile: (videoIndex: VideoIndex, file: File) => Promise<{ error?: string; warnings?: string[] }>;
}

export type CloudJobLoadFileKey = 'video' | 'metadata';

export interface LoadCloudJobOptions {
    onFileProgress?: (
        key: CloudJobLoadFileKey,
        status: 'loading' | 'success' | 'error',
        error?: string,
    ) => void;
    onFileDownloadProgress?: (key: CloudJobLoadFileKey, update: DownloadProgress) => void;
}

export interface DownloadCloudJobMetadataOptions {
    onDownloadProgress?: (update: DownloadProgress) => void;
}

function isTerminalStatus(status: CloudJobSummary['status']): boolean {
    return status === 'ready' || status === 'failed';
}

function isProcessingStatus(status: CloudJobSummary['status']): boolean {
    return status === 'queued'
        || status === 'validating'
        || status === 'transcoding'
        || status === 'processing';
}

export function useReplayCloud() {
    const enabled = isReplayCloudEnabled();
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const [isConnecting, setIsConnecting] = useState(enabled);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [jobs, setJobs] = useState<CloudJobSummary[]>([]);
    const [activeUpload, setActiveUpload] = useState<ActiveCloudUpload | null>(null);
    const activeUploadRef = useRef<ActiveCloudUpload | null>(null);

    useEffect(() => {
        activeUploadRef.current = activeUpload;
    }, [activeUpload]);

    const refreshJobs = useCallback(async () => {
        if (!enabled || !isBootstrapped) {
            return;
        }
        try {
            const nextJobs = await listCloudJobs();
            setJobs(nextJobs);

            const trackedJobId = activeUploadRef.current?.jobId;
            if (!trackedJobId) {
                return;
            }

            const trackedJob = nextJobs.find((job) => job.job_id === trackedJobId);
            if (!trackedJob) {
                return;
            }

            if (trackedJob.status === 'ready') {
                setActiveUpload((prev) => prev && prev.jobId === trackedJobId
                    ? { ...prev, phase: 'ready', error: null, uploadProgress: 1 }
                    : prev);
            } else if (trackedJob.status === 'failed') {
                setActiveUpload((prev) => prev && prev.jobId === trackedJobId
                    ? {
                        ...prev,
                        phase: 'failed',
                        error: trackedJob.error_message ?? 'Processing failed.',
                    }
                    : prev);
            } else if (isProcessingStatus(trackedJob.status)) {
                setActiveUpload((prev) => prev && prev.jobId === trackedJobId
                    ? { ...prev, phase: 'processing', error: null }
                    : prev);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not refresh cloud jobs.';
            toast.error(message);
        }
    }, [enabled, isBootstrapped]);

    useEffect(() => {
        if (!enabled) {
            setIsConnecting(false);
            return;
        }

        let cancelled = false;

        const connect = async () => {
            setIsConnecting(true);
            setConnectionError(null);
            setIsBootstrapped(false);

            try {
                await bootstrapReplayCloudClient();
                if (!cancelled) {
                    setIsBootstrapped(true);
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }

                const message = error instanceof ReplayCloudError
                    ? error.message
                    : error instanceof Error
                        ? error.message
                        : 'Could not connect to Replay Cloud.';
                setConnectionError(message);
            } finally {
                if (!cancelled) {
                    setIsConnecting(false);
                }
            }
        };

        void connect();

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    const retryConnection = useCallback(async () => {
        if (!enabled || isConnecting) {
            return;
        }

        setIsConnecting(true);
        setConnectionError(null);
        setIsBootstrapped(false);

        try {
            await bootstrapReplayCloudClient();
            setIsBootstrapped(true);
        } catch (error) {
            const message = error instanceof ReplayCloudError
                ? error.message
                : error instanceof Error
                    ? error.message
                    : 'Could not connect to Replay Cloud.';
            setConnectionError(message);
        } finally {
            setIsConnecting(false);
        }
    }, [enabled, isConnecting]);

    useEffect(() => {
        if (!enabled || !isBootstrapped) {
            return;
        }
        void refreshJobs();
    }, [enabled, isBootstrapped, refreshJobs]);

    useEffect(() => {
        const eventsUrl = getReplayCloudEventsUrl();
        if (!enabled || !isBootstrapped || !eventsUrl) {
            return;
        }

        const source = new EventSource(eventsUrl, { withCredentials: true });

        const handleJobEvent = () => {
            void refreshJobs();
        };

        source.addEventListener('job.updated', handleJobEvent);
        source.addEventListener('job.ready', handleJobEvent);
        source.addEventListener('job.failed', handleJobEvent);

        return () => {
            source.close();
        };
    }, [enabled, isBootstrapped, refreshJobs]);

    const setUploadPhase = useCallback((jobId: string, filename: string, phase: CloudUploadPhase, patch?: Partial<ActiveCloudUpload>) => {
        setActiveUpload({
            jobId,
            filename,
            phase,
            uploadProgress: patch?.uploadProgress ?? (phase === 'ready' ? 1 : 0),
            error: patch?.error ?? null,
        });
    }, []);

    const uploadVideo = useCallback(async (file: File) => {
        if (!enabled) {
            throw new Error('Replay Cloud is not configured.');
        }
        if (!isBootstrapped) {
            throw new Error('Replay Cloud is still connecting.');
        }

        try {
            setUploadPhase('pending', file.name, 'probing');
            const probe = await probeCloudVideoFile(file);

            setUploadPhase('pending', file.name, 'creating');
            const contentType = file.type || (file.name.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4');
            const created = await createCloudJob({
                filename: file.name,
                content_type: contentType,
                file_size_bytes: file.size,
                duration_seconds: probe.durationSeconds,
            });

            setUploadPhase(created.job_id, file.name, 'uploading', { uploadProgress: 0 });
            await uploadFileToPresignedUrl(
                created.upload_url,
                file,
                created.upload_headers,
                (progress) => {
                    setActiveUpload((prev) => prev && prev.jobId === created.job_id
                        ? { ...prev, uploadProgress: progress }
                        : prev);
                },
            );

            setUploadPhase(created.job_id, file.name, 'completing', { uploadProgress: 1 });
            await completeCloudJob(created.job_id);
            await refreshJobs();
            setActiveUpload(null);
            toast.success('Upload complete — processing in the cloud.');
        } catch (error) {
            const message = error instanceof ReplayCloudError
                ? error.message
                : error instanceof Error
                    ? error.message
                    : 'Cloud upload failed.';

            setActiveUpload((prev) => prev
                ? { ...prev, phase: 'failed', error: message }
                : {
                    jobId: 'failed',
                    filename: file.name,
                    phase: 'failed',
                    uploadProgress: 0,
                    error: message,
                });
            toast.error(message);
            throw error;
        }
    }, [enabled, isBootstrapped, refreshJobs, setUploadPhase]);

    const loadJobIntoSlot = useCallback(async (
        jobId: string,
        videoIndex: VideoIndex,
        handlers: LoadCloudJobHandlers,
        options?: LoadCloudJobOptions,
    ) => {
        const report = options?.onFileProgress;
        const reportDownload = options?.onFileDownloadProgress;
        const job = jobs.find((entry) => entry.job_id === jobId) ?? await getCloudJob(jobId);
        if (job.status !== 'ready') {
            throw new Error('Cloud job is not ready yet.');
        }

        report?.('video', 'loading');
        report?.('metadata', 'loading');

        const assets = await getCloudJobAssets(jobId);
        const metadataBaseName = job.original_filename.replace(/\.[^.]+$/, '') || 'cloud';

        const [videoResult, metadataResult] = await Promise.all([
            downloadUrlWithProgress(assets.video_url, 'blob', (update) => {
                reportDownload?.('video', update);
            })
                .then((blob) => {
                    report?.('video', 'success');
                    return blob as Blob;
                })
                .catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : 'Video download failed.';
                    report?.('video', 'error', message);
                    throw error;
                }),
            downloadUrlWithProgress(assets.metadata_url, 'text', (update) => {
                reportDownload?.('metadata', update);
            })
                .then((text) => {
                    report?.('metadata', 'success');
                    return text as string;
                })
                .catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : 'Metadata download failed.';
                    report?.('metadata', 'error', message);
                    throw error;
                }),
        ]);

        const videoFile = new File([videoResult], job.original_filename, { type: 'video/mp4' });
        const metadataFile = new File(
            [metadataResult],
            `${metadataBaseName}_trajectory_metadata.json`,
            { type: 'application/json' },
        );

        handlers.clearVideoDimensions(videoIndex);

        const result = await handlers.handleTrajectoryFile(videoIndex, metadataFile);
        if (result.error) {
            report?.('metadata', 'error', result.error);
            throw new Error(result.error);
        }

        handlers.replaceVideoSource(videoIndex, videoFile);

        toast.success(`Loaded ${job.original_filename} into Video ${videoIndex + 1}.`);
    }, [jobs]);

    const downloadJobMetadata = useCallback(async (jobId: string, options?: DownloadCloudJobMetadataOptions) => {
        try {
            const job = jobs.find((entry) => entry.job_id === jobId) ?? await getCloudJob(jobId);
            if (job.status !== 'ready') {
                throw new Error('Cloud job is not ready yet.');
            }

            const assets = await getCloudJobAssets(jobId);
            const metadataBaseName = job.original_filename.replace(/\.[^.]+$/, '') || 'cloud';
            const metadataFileName = `${metadataBaseName}_trajectory_metadata.json`;
            const metadataText = await downloadUrlWithProgress(
                assets.metadata_url,
                'text',
                options?.onDownloadProgress,
            );
            const blob = new Blob([metadataText as string], { type: 'application/json' });
            triggerBlobDownload(blob, metadataFileName);
            toast.success(`Downloaded ${metadataFileName}.`);
        } catch (error) {
            const message = error instanceof ReplayCloudError
                ? error.message
                : error instanceof Error
                    ? error.message
                    : 'Metadata download failed.';
            toast.error(message);
            throw error;
        }
    }, [jobs]);

    const clearActiveUpload = useCallback(() => {
        setActiveUpload(null);
    }, []);

    const deleteJob = useCallback(async (jobId: string) => {
        await deleteCloudJob(jobId);
        setActiveUpload((prev) => prev?.jobId === jobId ? null : prev);
        await refreshJobs();
        toast.success('Cloud upload deleted.');
    }, [refreshJobs]);

    const inProgressCount = jobs.filter((job) => isProcessingStatus(job.status)).length;
    const readyJobs = jobs.filter((job) => job.status === 'ready');

    return {
        enabled,
        isBootstrapped,
        isConnecting,
        connectionError,
        retryConnection,
        jobs,
        readyJobs,
        activeUpload,
        inProgressCount,
        uploadVideo,
        loadJobIntoSlot,
        downloadJobMetadata,
        deleteJob,
        refreshJobs,
        clearActiveUpload,
    };
}
