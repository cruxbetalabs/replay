'use client';

import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { VideoDropzone } from '../VideoDropzone';
import { ReplayComparisonWorkspace } from './ReplayComparisonWorkspace';
import { useTrajectoryState } from '../../hooks/useTrajectoryState';
import { useVideoSources } from '../../hooks/useVideoSources';
import { getKeyMomentStorageKey, type KeyMoment } from '../../lib/key-moments';

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
        trajectoryWarningsByIndex,
        canRenderOverlayByIndex,
        availableTrajectoryTrackNames,
        hasAnyOverlayData,
        hasPoseMetadata,
        handleTrajectoryUpload,
        clearTrajectory,
        updateVideoDimensions,
        clearVideoDimensions,
    } = useTrajectoryState({ hasVideoByIndex });

    const keyMomentStorageKey = useMemo(() => getKeyMomentStorageKey(videoSources), [videoSources]);

    const handleReplaceVideo = useCallback((videoIndex: 0 | 1, file: File) => {
        clearVideoDimensions(videoIndex);
        replaceVideoSource(videoIndex, file);
    }, [clearVideoDimensions, replaceVideoSource]);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (file && file.type.startsWith('video/')) {
            handleReplaceVideo(0, file);
        }
    }, [handleReplaceVideo]);

    const handleFileUpload2 = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (file && file.type.startsWith('video/')) {
            handleReplaceVideo(1, file);
        }
    }, [handleReplaceVideo]);

    const handleRemoveVideo1 = useCallback(() => {
        clearVideoDimensions(0);
        removeVideo(0);
    }, [clearVideoDimensions, removeVideo]);

    const handleRemoveVideo2 = useCallback(() => {
        clearVideoDimensions(1);
        removeVideo(1);
    }, [clearVideoDimensions, removeVideo]);

    const splitViewContent = useCallback(({
        calculatingByIndex,
        trajectoryHistoryWindowSec,
        visibleTrajectoryTrackNames,
        showPose,
    }: {
        calculatingByIndex: [boolean, boolean];
        trajectoryHistoryWindowSec: number | null;
        visibleTrajectoryTrackNames: string[];
        showPose: boolean;
    }): ReactNode => (
        <>
            <VideoDropzone
                label="Video 1"
                videoUrl={videoUrl}
                ref={videoRef}
                onUpload={handleFileUpload}
                isCalculating={calculatingByIndex[0]}
                trajectoryMetadata={overlayMetadataByIndex[0]}
                trajectoryFileName={trajectoryByIndex[0].fileName}
                trajectoryError={trajectoryByIndex[0].error}
                trajectoryWarnings={trajectoryWarningsByIndex[0]}
                canRenderTrajectory={canRenderOverlayByIndex[0]}
                trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                showPose={showPose}
                onTrajectoryUpload={(event) => handleTrajectoryUpload(0, event)}
                onRemoveTrajectory={() => clearTrajectory(0)}
                onVideoMetadataLoad={(metadata) => updateVideoDimensions(0, metadata)}
            />
            <VideoDropzone
                label="Video 2"
                videoUrl={videoUrl2}
                ref={videoRef2}
                onUpload={handleFileUpload2}
                isCalculating={calculatingByIndex[1]}
                trajectoryMetadata={overlayMetadataByIndex[1]}
                trajectoryFileName={trajectoryByIndex[1].fileName}
                trajectoryError={trajectoryByIndex[1].error}
                trajectoryWarnings={trajectoryWarningsByIndex[1]}
                canRenderTrajectory={canRenderOverlayByIndex[1]}
                trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                showPose={showPose}
                onTrajectoryUpload={(event) => handleTrajectoryUpload(1, event)}
                onRemoveTrajectory={() => clearTrajectory(1)}
                onVideoMetadataLoad={(metadata) => updateVideoDimensions(1, metadata)}
            />
        </>
    ), [
        canRenderOverlayByIndex,
        clearTrajectory,
        handleFileUpload,
        handleFileUpload2,
        handleTrajectoryUpload,
        overlayMetadataByIndex,
        trajectoryByIndex,
        trajectoryWarningsByIndex,
        updateVideoDimensions,
        videoRef,
        videoRef2,
        videoUrl,
        videoUrl2,
    ]);

    return (
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
            onKeyMomentsChange={onKeyMomentsChange}
        />
    );
}