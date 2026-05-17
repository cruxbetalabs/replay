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
        canRenderOverlayByIndex,
        availableTrajectoryTrackNames,
        hasAnyOverlayData,
        hasPoseMetadata,
        handleTrajectoryFile,
        clearTrajectory,
        updateVideoDimensions,
        clearVideoDimensions,
    } = useTrajectoryState({ hasVideoByIndex });

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
            />
            <VideoDropzone
                label="Video 2"
                videoUrl={videoUrl2}
                ref={videoRef2}
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
            />
        </>
    ), [
        canRenderOverlayByIndex,
        clearTrajectory,
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
        />
    );
}