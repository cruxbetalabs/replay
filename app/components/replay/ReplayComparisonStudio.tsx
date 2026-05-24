'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { VideoDropzone } from '../VideoDropzone';
import { ReplayComparisonWorkspace, type SplitViewContentProps } from './ReplayComparisonWorkspace';
import { useReplayCloud } from '../../hooks/useReplayCloud';
import { useTrajectoryState } from '../../hooks/useTrajectoryState';
import { useVideoSources } from '../../hooks/useVideoSources';
import { getKeyMomentStorageKey, type KeyMoment } from '../../lib/key-moments';
import type { KeyMomentPresetState } from '../../lib/presets';
import { PRESET_COMPARISONS, type PresetComparison } from '../../lib/presets';
import type { VideoIndex } from '../../lib/key-moments';
import { PresetLoadingDialog, type PresetLoadFileRow } from './PresetLoadingDialog';
import { CloudJobDragProvider } from './CloudJobDragContext';

interface ReplayComparisonStudioProps {
    onKeyMomentsChange?: (keyMoments: KeyMoment[]) => void;
}

export function ReplayComparisonStudio({
    onKeyMomentsChange,
}: ReplayComparisonStudioProps) {
    const {
        videoUrl1: videoUrl,
        videoUrl2,
        videoRef1: videoRef,
        videoRef2,
        videoRefs,
        videoUrls,
        replaceVideoSource,
        removeVideo,
        videoSources,
    } = useVideoSources();

    const hasVideoByIndex: [boolean, boolean] = [Boolean(videoUrl), Boolean(videoUrl2)];
    const {
        trajectoryByIndex,
        overlayMetadataByIndex,
        canRenderOverlayByIndex,
        availableTrajectoryTrackNames,
        hasAnyOverlayData,
        hasPoseMetadata,
        handleTrajectoryFile,
        clearTrajectory,
        updateVideoDimensions,
        clearVideoDimensions,
    } = useTrajectoryState({ hasVideoByIndex });

    const {
        enabled: cloudEnabled,
        isBootstrapped: cloudBootstrapped,
        jobs: cloudJobs,
        readyJobs: cloudReadyJobs,
        activeUpload: cloudActiveUpload,
        inProgressCount: cloudInProgressCount,
        uploadVideo: uploadCloudVideo,
        loadJobIntoSlot: loadCloudJobIntoSlot,
        downloadJobMetadata: downloadCloudJobMetadata,
        deleteJob: deleteCloudJob,
        refreshJobs: refreshCloudJobs,
        clearActiveUpload: clearCloudActiveUpload,
    } = useReplayCloud();

    const keyMomentStorageKey = useMemo(() => getKeyMomentStorageKey(videoSources), [videoSources]);

    const handleReplaceVideo = useCallback((videoIndex: 0 | 1, file: File) => {
        clearVideoDimensions(videoIndex);
        replaceVideoSource(videoIndex, file);
    }, [clearVideoDimensions, replaceVideoSource]);

    const handleRemoveVideo1 = useCallback(() => {
        clearVideoDimensions(0);
        removeVideo(0);
    }, [clearVideoDimensions, removeVideo]);

    const handleRemoveVideo2 = useCallback(() => {
        clearVideoDimensions(1);
        removeVideo(1);
    }, [clearVideoDimensions, removeVideo]);

    const handleRemoveAllMetadata = useCallback(() => {
        clearTrajectory(0);
        clearTrajectory(1);
    }, [clearTrajectory]);

    const [presetKeyMomentsStamp, setPresetKeyMomentsStamp] = useState<string | null>(null);
    const [presetKeyMomentsState, setPresetKeyMomentsState] = useState<KeyMomentPresetState | null>(null);
    const [presetLoadOpen, setPresetLoadOpen] = useState(false);
    const [presetLoadLabel, setPresetLoadLabel] = useState('');
    const [presetLoadRows, setPresetLoadRows] = useState<PresetLoadFileRow[]>([]);
    const [presetLoadDescriptions, setPresetLoadDescriptions] = useState({
        loading: 'Fetching files…',
        success: 'All files loaded successfully.',
        error: 'Some files could not be loaded.',
    });
    const isLoadingCloudJob = presetLoadOpen && presetLoadRows.some((row) => row.status === 'loading');

    const handleLoadCloudJob = useCallback(async (jobId: string, videoIndex: VideoIndex) => {
        const job = cloudJobs.find((entry) => entry.job_id === jobId)
            ?? cloudReadyJobs.find((entry) => entry.job_id === jobId);
        if (!job) {
            return;
        }

        const metadataBaseName = job.original_filename.replace(/\.[^.]+$/, '') || 'cloud';
        const metadataFileName = `${metadataBaseName}_trajectory_metadata.json`;

        setPresetLoadDescriptions({
            loading: 'Fetching files…',
            success: 'All files loaded successfully.',
            error: 'Some files could not be loaded.',
        });
        setPresetLoadLabel(`Video ${videoIndex + 1} · ${job.original_filename}`);
        setPresetLoadRows([
            { key: 'video', fileName: job.original_filename, kind: 'video', status: 'loading' },
            { key: 'metadata', fileName: metadataFileName, kind: 'metadata', status: 'loading' },
        ]);
        setPresetLoadOpen(true);

        const updateRow = (key: string, update: Partial<PresetLoadFileRow>) =>
            setPresetLoadRows((prev) => prev.map((row) => row.key === key ? { ...row, ...update } : row));

        try {
            await loadCloudJobIntoSlot(jobId, videoIndex, {
                clearVideoDimensions,
                replaceVideoSource,
                handleTrajectoryFile,
            }, {
                onFileProgress: (key, status, error) => {
                    updateRow(key, {
                        status,
                        error,
                        ...(status === 'success' ? { progress: 1 } : {}),
                    });
                },
                onFileDownloadProgress: (key, update) => {
                    updateRow(key, {
                        progress: update.progress,
                        loadedBytes: update.loaded,
                        totalBytes: update.total,
                    });
                },
            });

            setTimeout(() => setPresetLoadOpen(false), 1200);
        } catch {
            // Row-level errors are already shown in the dialog.
        }
    }, [
        clearVideoDimensions,
        cloudJobs,
        cloudReadyJobs,
        handleTrajectoryFile,
        loadCloudJobIntoSlot,
        replaceVideoSource,
    ]);

    const handleDownloadCloudJobMetadata = useCallback(async (jobId: string) => {
        const job = cloudJobs.find((entry) => entry.job_id === jobId)
            ?? cloudReadyJobs.find((entry) => entry.job_id === jobId);
        if (!job) {
            return;
        }

        const metadataBaseName = job.original_filename.replace(/\.[^.]+$/, '') || 'cloud';
        const metadataFileName = `${metadataBaseName}_trajectory_metadata.json`;

        setPresetLoadDescriptions({
            loading: 'Preparing download…',
            success: 'Download ready.',
            error: 'Could not download metadata.',
        });
        setPresetLoadLabel(job.original_filename);
        setPresetLoadRows([
            { key: 'metadata', fileName: metadataFileName, kind: 'metadata', status: 'loading', progress: 0 },
        ]);
        setPresetLoadOpen(true);

        const updateRow = (key: string, update: Partial<PresetLoadFileRow>) =>
            setPresetLoadRows((prev) => prev.map((row) => row.key === key ? { ...row, ...update } : row));

        try {
            await downloadCloudJobMetadata(jobId, {
                onDownloadProgress: (update) => {
                    updateRow('metadata', {
                        progress: update.progress,
                        loadedBytes: update.loaded,
                        totalBytes: update.total,
                    });
                },
            });
            updateRow('metadata', { status: 'success', progress: 1 });
            setTimeout(() => setPresetLoadOpen(false), 800);
        } catch (error) {
            updateRow('metadata', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Metadata download failed.',
            });
        }
    }, [cloudJobs, cloudReadyJobs, downloadCloudJobMetadata]);

    const loadPreset = useCallback(async (preset: PresetComparison) => {
        clearVideoDimensions(0);
        clearVideoDimensions(1);

        const videoFile1 = new File([], preset.left.videoFileName, { type: 'video/mp4' });
        replaceVideoSource(0, videoFile1, preset.left.videoUrl);
        if (preset.right) {
            const videoFile2 = new File([], preset.right.videoFileName, { type: 'video/mp4' });
            replaceVideoSource(1, videoFile2, preset.right.videoUrl);
        }

        const initialRows: PresetLoadFileRow[] = [
            { key: 'left-meta', fileName: preset.left.metadataFileName, kind: 'metadata', status: 'loading' },
            ...(preset.right ? [{ key: 'right-meta', fileName: preset.right.metadataFileName, kind: 'metadata' as const, status: 'loading' as const }] : []),
        ];
        if (preset.keyMomentsUrl) {
            const kmFileName = preset.keyMomentsUrl.split('/').pop() ?? 'keyframes.json';
            initialRows.push({ key: 'keymoments', fileName: kmFileName, kind: 'keymoments', status: 'loading' });
        }

        setPresetLoadDescriptions({
            loading: 'Fetching files…',
            success: 'All files loaded successfully.',
            error: 'Some files could not be loaded.',
        });
        setPresetLoadLabel(preset.label);
        setPresetLoadRows(initialRows);
        setPresetLoadOpen(true);

        const updateRow = (key: string, update: Partial<PresetLoadFileRow>) =>
            setPresetLoadRows((prev) => prev.map((r) => r.key === key ? { ...r, ...update } : r));

        const successMap: Record<string, boolean> = {};

        const fetchMeta = async (index: 0 | 1, key: string, url: string, fileName: string) => {
            try {
                const r = await fetch(url);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const blob = await r.blob();
                await handleTrajectoryFile(index, new File([blob], fileName, { type: 'application/json' }));
                updateRow(key, { status: 'success' });
                successMap[key] = true;
            } catch (err) {
                updateRow(key, { status: 'error', error: err instanceof Error ? err.message : 'Failed to load' });
                successMap[key] = false;
            }
        };

        const fetches: Promise<void>[] = [
            fetchMeta(0, 'left-meta', preset.left.metadataUrl, preset.left.metadataFileName),
            ...(preset.right ? [fetchMeta(1, 'right-meta', preset.right.metadataUrl, preset.right.metadataFileName)] : []),
        ];

        if (preset.keyMomentsUrl) {
            const kmUrl = preset.keyMomentsUrl;
            fetches.push(
                (async () => {
                    try {
                        const r = await fetch(kmUrl);
                        if (!r.ok) throw new Error(`HTTP ${r.status}`);
                        const data = await r.json() as unknown;
                        if (
                            data !== null
                            && typeof data === 'object'
                            && 'version' in data && data.version === 1
                            && 'keyMoments' in data && Array.isArray(data.keyMoments)
                        ) {
                            const parsed = data as { keyMoments: KeyMoment[]; selectedKeyMomentId?: string | null };
                            setPresetKeyMomentsState({
                                keyMoments: parsed.keyMoments,
                                selectedKeyMomentId: parsed.selectedKeyMomentId ?? null,
                            });
                            setPresetKeyMomentsStamp(crypto.randomUUID());
                        }
                        updateRow('keymoments', { status: 'success' });
                        successMap['keymoments'] = true;
                    } catch (err) {
                        updateRow('keymoments', { status: 'error', error: err instanceof Error ? err.message : 'Failed to load' });
                        successMap['keymoments'] = false;
                    }
                })()
            );
        }

        await Promise.all(fetches);

        if (
            Object.keys(successMap).length === initialRows.length
            && Object.values(successMap).every(Boolean)
        ) {
            setTimeout(() => setPresetLoadOpen(false), 1200);
        }
    }, [clearVideoDimensions, handleTrajectoryFile, replaceVideoSource]);

    const splitViewContent = useCallback(({
        calculatingByIndex,
        trajectoryHistoryWindowSec,
        visibleTrajectoryTrackNames,
        showPose,
        resetIKRefs,
    }: SplitViewContentProps): ReactNode => (
        <>
            <VideoDropzone
                label="Video 1"
                videoUrl={videoUrl}
                ref={videoRef}
                videoIndex={0}
                onCloudJobDrop={cloudEnabled ? handleLoadCloudJob : undefined}
                onVideoFileDrop={(file) => handleReplaceVideo(0, file)}
                onJsonFileDrop={(file) => handleTrajectoryFile(0, file)}
                isCalculating={calculatingByIndex[0]}
                trajectoryMetadata={overlayMetadataByIndex[0]}
                trajectoryFileName={trajectoryByIndex[0].fileName}
                canRenderTrajectory={canRenderOverlayByIndex[0]}
                trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                showPose={showPose}
                onRemoveTrajectory={() => clearTrajectory(0)}
                onVideoMetadataLoad={(metadata) => updateVideoDimensions(0, metadata)}
                resetIKRef={resetIKRefs[0]}
            />
            <VideoDropzone
                label="Video 2"
                videoUrl={videoUrl2}
                ref={videoRef2}
                videoIndex={1}
                onCloudJobDrop={cloudEnabled ? handleLoadCloudJob : undefined}
                onVideoFileDrop={(file) => handleReplaceVideo(1, file)}
                onJsonFileDrop={(file) => handleTrajectoryFile(1, file)}
                isCalculating={calculatingByIndex[1]}
                trajectoryMetadata={overlayMetadataByIndex[1]}
                trajectoryFileName={trajectoryByIndex[1].fileName}
                canRenderTrajectory={canRenderOverlayByIndex[1]}
                trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                showPose={showPose}
                onRemoveTrajectory={() => clearTrajectory(1)}
                onVideoMetadataLoad={(metadata) => updateVideoDimensions(1, metadata)}
                resetIKRef={resetIKRefs[1]}
            />
        </>
    ), [
        canRenderOverlayByIndex,
        clearTrajectory,
        cloudEnabled,
        handleLoadCloudJob,
        handleReplaceVideo,
        handleTrajectoryFile,
        overlayMetadataByIndex,
        trajectoryByIndex,
        updateVideoDimensions,
        videoRef,
        videoRef2,
        videoUrl,
        videoUrl2,
    ]);

    return (
        <CloudJobDragProvider>
            <>
                <ReplayComparisonWorkspace
                splitViewContent={splitViewContent}
                videoRefs={videoRefs}
                videoUrls={videoUrls}
                overlayMetadataByIndex={overlayMetadataByIndex}
                canRenderOverlayByIndex={canRenderOverlayByIndex}
                availableTrajectoryTrackNames={availableTrajectoryTrackNames}
                hasAnyOverlayData={hasAnyOverlayData}
                hasPoseMetadata={hasPoseMetadata}
                storageKey={keyMomentStorageKey}
                showRemoveVideos
                onRemoveVideo1={handleRemoveVideo1}
                onRemoveVideo2={handleRemoveVideo2}
                onRemoveMetadata={handleRemoveAllMetadata}
                onKeyMomentsChange={onKeyMomentsChange}
                presets={PRESET_COMPARISONS}
                onLoadPreset={loadPreset}
                presetKeyMomentsStamp={presetKeyMomentsStamp}
                presetKeyMomentsState={presetKeyMomentsState}
                cloudEnabled={cloudEnabled}
                cloudBootstrapped={cloudBootstrapped}
                cloudJobs={cloudJobs}
                cloudActiveUpload={cloudActiveUpload}
                cloudInProgressCount={cloudInProgressCount}
                onCloudUpload={uploadCloudVideo}
                onLoadCloudJob={handleLoadCloudJob}
                onDownloadCloudJobMetadata={handleDownloadCloudJobMetadata}
                onDeleteCloudJob={deleteCloudJob}
                onRefreshCloudJobs={refreshCloudJobs}
                onClearCloudUpload={clearCloudActiveUpload}
                isLoadingCloudJob={isLoadingCloudJob}
            />
            <PresetLoadingDialog
                open={presetLoadOpen}
                presetLabel={presetLoadLabel}
                rows={presetLoadRows}
                loadingDescription={presetLoadDescriptions.loading}
                successDescription={presetLoadDescriptions.success}
                errorDescription={presetLoadDescriptions.error}
                onClose={() => setPresetLoadOpen(false)}
            />
            </>
        </CloudJobDragProvider>
    );
}