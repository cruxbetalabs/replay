'use client';

import { useCallback, useRef, useState } from 'react';
import { CloudUpload, CloudOff, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CloudJobCard } from './CloudJobCard';
import type { VideoIndex } from '../../lib/key-moments';
import { CLOUD_RETENTION_DAYS, MAX_CLOUD_DURATION_SECONDS, MAX_CLOUD_UPLOAD_BYTES } from '../../lib/replay-cloud/constants';
import { isSupportedCloudVideo } from '../../lib/replay-cloud/probe-video';
import type { ActiveCloudUpload, CloudJobSummary } from '../../lib/replay-cloud/types';
import {
    formatCloudUploadPhase,
} from './cloud-job-utils';

interface CloudUploadSectionProps {
    isBootstrapped: boolean;
    isConnecting?: boolean;
    connectionError?: string | null;
    activeUpload: ActiveCloudUpload | null;
    jobs: CloudJobSummary[];
    onUpload: (file: File) => Promise<void>;
    onLoadJob: (jobId: string, videoIndex: VideoIndex) => Promise<void>;
    onDownloadJobMetadata?: (jobId: string) => Promise<void>;
    onDeleteJob: (jobId: string) => Promise<void>;
    onClearActiveUpload?: () => void;
    isLoadingCloudJob?: boolean;
    hideHeader?: boolean;
}

export function CloudUploadSection({
    isBootstrapped,
    isConnecting = false,
    connectionError = null,
    activeUpload,
    jobs,
    onUpload,
    onLoadJob,
    onDownloadJobMetadata,
    onDeleteJob,
    onClearActiveUpload,
    isLoadingCloudJob = false,
    hideHeader = false,
}: CloudUploadSectionProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const isActivelyUploading = activeUpload !== null && (
        activeUpload.phase === 'probing'
        || activeUpload.phase === 'creating'
        || activeUpload.phase === 'uploading'
        || activeUpload.phase === 'completing'
    );

    const showUploadError = activeUpload?.phase === 'failed';

    const showConnectionError = connectionError !== null;
    const canUpload = isBootstrapped && !isConnecting && !showConnectionError;

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const file = Array.from(files).find(isSupportedCloudVideo);
        if (!file) {
            return;
        }
        await onUpload(file);
    }, [onUpload]);

    const handleLoad = useCallback(async (jobId: string, videoIndex: VideoIndex) => {
        await onLoadJob(jobId, videoIndex);
    }, [onLoadJob]);

    const uploadProgressPercent = Math.round((activeUpload?.uploadProgress ?? 0) * 100);

    return (
        <div className="flex flex-col gap-4">
            {!hideHeader && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1.5">
                        Cloud upload
                    </p>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Process in the cloud
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Upload a climbing video and Replay Cloud will run{' '}
                        <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono text-xs">cruxes</code>{' '}
                        for you. When processing finishes, load the result into Video 1 or 2.
                    </p>
                </div>
            )}

            <div
                role={canUpload ? 'button' : undefined}
                tabIndex={canUpload ? 0 : undefined}
                onKeyDown={(event) => {
                    if (!canUpload) {
                        return;
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onClick={() => canUpload && !isActivelyUploading && inputRef.current?.click()}
                onDragOver={(event) => {
                    event.preventDefault();
                    if (!isActivelyUploading && canUpload) {
                        setIsDragging(true);
                    }
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    if (!isActivelyUploading && canUpload) {
                        void handleFiles(event.dataTransfer.files);
                    }
                }}
                className={[
                    'relative rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
                    showConnectionError
                        ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
                        : isDragging
                            ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30'
                            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600',
                    showConnectionError
                        ? 'cursor-default'
                        : isActivelyUploading || !canUpload
                            ? 'cursor-not-allowed opacity-70'
                            : 'cursor-pointer',
                ].join(' ')}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,.mp4,.mov"
                    className="hidden"
                    disabled={isActivelyUploading || !canUpload}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) {
                            void handleFiles([file]);
                        }
                    }}
                />

                <div className="flex flex-col items-center gap-2">
                    {showConnectionError ? (
                        <CloudOff className="size-8 text-red-500 dark:text-red-400" />
                    ) : isActivelyUploading || isConnecting ? (
                        <Loader2 className="size-8 text-blue-500 animate-spin" />
                    ) : (
                        <CloudUpload className="size-8 text-gray-400 dark:text-gray-500" />
                    )}
                    <p className={[
                        'text-sm font-medium',
                        showConnectionError
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-gray-700 dark:text-gray-300',
                    ].join(' ')}>
                        {showConnectionError
                            ? 'Replay Cloud is not available'
                            : isConnecting
                                ? 'Connecting to Replay Cloud…'
                                : isActivelyUploading
                                    ? formatCloudUploadPhase(activeUpload!.phase)
                                    : 'Drop a video here or click to browse'}
                    </p>
                    {!showConnectionError && !isActivelyUploading && !isConnecting && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            .mp4 / .mov · up to {MAX_CLOUD_UPLOAD_BYTES / (1024 * 1024)} MB · {MAX_CLOUD_DURATION_SECONDS / 60} min max · kept {CLOUD_RETENTION_DAYS} days
                        </p>
                    )}
                </div>

                {activeUpload && activeUpload.phase === 'uploading' && (
                    <div className="mt-4 mx-auto max-w-xs">
                        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-150"
                                style={{ width: `${uploadProgressPercent}%` }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {uploadProgressPercent}% · {activeUpload.filename}
                        </p>
                    </div>
                )}

                {showUploadError && (
                    <div className="mt-3 flex items-start justify-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <span>{activeUpload.error ?? 'Upload failed.'}</span>
                        {onClearActiveUpload && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onClearActiveUpload();
                                }}
                                aria-label="Dismiss error"
                            >
                                <X className="size-3.5" />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {jobs.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                        Your uploads
                    </p>
                    <ul className="space-y-2">
                        {jobs.map((job) => (
                            <CloudJobCard
                                key={job.job_id}
                                job={job}
                                dragSource="sidebar"
                                disabled={isLoadingCloudJob}
                                onLoad={(jobId, videoIndex) => void handleLoad(jobId, videoIndex)}
                                onDownloadMetadata={onDownloadJobMetadata}
                                onDelete={onDeleteJob}
                            />
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
