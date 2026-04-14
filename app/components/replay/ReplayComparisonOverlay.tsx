'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ReplayBoundVideoStage } from './ReplayBoundVideoStage';
import { ReplayComparisonWorkspace } from './ReplayComparisonWorkspace';
import type { ReplayComparisonSource } from './types';
import { getTrajectoryCompatibilityWarnings, isTrajectoryCompatibleWithVideo } from '../../lib/trajectory-compatibility';
import { getKeyMomentStorageKey, type KeyMoment } from '../../lib/key-moments';
import { parseTrajectoryMetadata } from '../../lib/trajectory-parser';
import type { TrajectoryMetadata, VideoDimensions } from '../../lib/trajectory-types';

interface ResolvedTrajectoryState {
    fileName: string | null;
    metadata: TrajectoryMetadata | null;
    warnings: string[];
    error: string | null;
}

export interface ReplayComparisonOverlayProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sources: [ReplayComparisonSource | null, ReplayComparisonSource | null];
    title?: string;
    storageKey?: string | null;
    onKeyMomentsChange?: (keyMoments: KeyMoment[]) => void;
}

const createEmptyTrajectoryState = (): ResolvedTrajectoryState => ({
    fileName: null,
    metadata: null,
    warnings: [],
    error: null,
});

const resolveTrajectoryState = (source: ReplayComparisonSource | null): ResolvedTrajectoryState => {
    const trajectory = source?.trajectory;
    if (!trajectory) {
        return createEmptyTrajectoryState();
    }

    if (trajectory.error) {
        return {
            fileName: trajectory.fileName ?? null,
            metadata: null,
            warnings: trajectory.warnings ?? [],
            error: trajectory.error,
        };
    }

    if (trajectory.metadata == null) {
        return {
            fileName: trajectory.fileName ?? null,
            metadata: null,
            warnings: trajectory.warnings ?? [],
            error: null,
        };
    }

    if (typeof trajectory.metadata !== 'string') {
        return {
            fileName: trajectory.fileName ?? null,
            metadata: trajectory.metadata,
            warnings: trajectory.warnings ?? [],
            error: null,
        };
    }

    try {
        const parsedMetadata = parseTrajectoryMetadata(trajectory.metadata);
        return {
            fileName: trajectory.fileName ?? null,
            metadata: parsedMetadata.metadata,
            warnings: [...(trajectory.warnings ?? []), ...parsedMetadata.warnings],
            error: null,
        };
    } catch (error) {
        return {
            fileName: trajectory.fileName ?? null,
            metadata: null,
            warnings: trajectory.warnings ?? [],
            error: error instanceof Error ? error.message : 'Unable to parse trajectory metadata.',
        };
    }
};

function useResolvedSourceVideoUrls(sources: [ReplayComparisonSource | null, ReplayComparisonSource | null]) {
    const [videoUrls, setVideoUrls] = useState<[string | null, string | null]>([null, null]);
    const primaryVideo = sources[0]?.video ?? null;
    const secondaryVideo = sources[1]?.video ?? null;

    useEffect(() => {
        const objectUrls: [string | null, string | null] = [null, null];
        const nextUrls: [string | null, string | null] = [primaryVideo, secondaryVideo].map((video, index) => {
            if (video instanceof Blob) {
                const objectUrl = URL.createObjectURL(video);
                objectUrls[index as 0 | 1] = objectUrl;
                return objectUrl;
            }

            return typeof video === 'string' ? video : null;
        }) as [string | null, string | null];

        setVideoUrls(nextUrls);

        return () => {
            objectUrls.forEach((objectUrl) => {
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                }
            });
        };
    }, [primaryVideo, secondaryVideo]);

    return videoUrls;
}

export function ReplayComparisonOverlay({
    open,
    onOpenChange,
    sources,
    title,
    storageKey = null,
    onKeyMomentsChange,
}: ReplayComparisonOverlayProps) {
    const videoRef1 = useRef<HTMLVideoElement>(null);
    const videoRef2 = useRef<HTMLVideoElement>(null);
    const videoRefs: [typeof videoRef1, typeof videoRef2] = [videoRef1, videoRef2];
    const videoUrls = useResolvedSourceVideoUrls(sources);
    const hasVideoByIndex: [boolean, boolean] = [Boolean(videoUrls[0]), Boolean(videoUrls[1])];
    const [videoDimensionsByIndex, setVideoDimensionsByIndex] = useState<[VideoDimensions | null, VideoDimensions | null]>([null, null]);

    const trajectoryByIndex = useMemo<[ResolvedTrajectoryState, ResolvedTrajectoryState]>(() => [
        resolveTrajectoryState(sources[0]),
        resolveTrajectoryState(sources[1]),
    ], [sources]);

    const overlayMetadataByIndex: [TrajectoryMetadata | null, TrajectoryMetadata | null] = useMemo(() => [
        trajectoryByIndex[0].metadata,
        trajectoryByIndex[1].metadata,
    ], [trajectoryByIndex]);

    const trajectoryWarningsByIndex: [string[], string[]] = useMemo(() => [0, 1].map((index) => {
        const trajectoryState = trajectoryByIndex[index as 0 | 1];
        return [
            ...trajectoryState.warnings,
            ...getTrajectoryCompatibilityWarnings(trajectoryState.metadata, videoDimensionsByIndex[index as 0 | 1]),
        ];
    }) as [string[], string[]], [trajectoryByIndex, videoDimensionsByIndex]);

    const canRenderOverlayByIndex: [boolean, boolean] = useMemo(() => [0, 1].map((index) => {
        const overlayMetadata = overlayMetadataByIndex[index as 0 | 1];
        if (!overlayMetadata) {
            return false;
        }

        if (!hasVideoByIndex[index as 0 | 1]) {
            return true;
        }

        return isTrajectoryCompatibleWithVideo(overlayMetadata, videoDimensionsByIndex[index as 0 | 1]);
    }) as [boolean, boolean], [hasVideoByIndex, overlayMetadataByIndex, videoDimensionsByIndex]);

    const availableTrajectoryTrackNames = useMemo(() => Array.from(new Set(
        trajectoryByIndex.flatMap((trajectoryState) => Object.keys(trajectoryState.metadata?.tracks ?? {})),
    )).sort((left, right) => left.localeCompare(right)), [trajectoryByIndex]);

    const hasAnyOverlayData = overlayMetadataByIndex.some(Boolean);
    const hasPoseMetadata = overlayMetadataByIndex.some((metadata) => metadata?.pose != null);

    const resolvedStorageKey = useMemo(
        () => storageKey ?? getKeyMomentStorageKey([
            sources[0]?.videoIdentity ?? null,
            sources[1]?.videoIdentity ?? null,
        ]),
        [sources, storageKey],
    );

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
            <ReplayBoundVideoStage
                label={sources[0]?.label ?? 'Video 1'}
                videoUrl={videoUrls[0]}
                videoRef={videoRef1}
                isCalculating={calculatingByIndex[0]}
                trajectoryMetadata={overlayMetadataByIndex[0]}
                trajectoryFileName={trajectoryByIndex[0].fileName}
                trajectoryError={trajectoryByIndex[0].error}
                trajectoryWarnings={trajectoryWarningsByIndex[0]}
                canRenderTrajectory={canRenderOverlayByIndex[0]}
                trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                showPose={showPose}
                onVideoMetadataLoad={(metadata) => setVideoDimensionsByIndex((prev) => [metadata, prev[1]])}
            />
            <ReplayBoundVideoStage
                label={sources[1]?.label ?? 'Video 2'}
                videoUrl={videoUrls[1]}
                videoRef={videoRef2}
                isCalculating={calculatingByIndex[1]}
                trajectoryMetadata={overlayMetadataByIndex[1]}
                trajectoryFileName={trajectoryByIndex[1].fileName}
                trajectoryError={trajectoryByIndex[1].error}
                trajectoryWarnings={trajectoryWarningsByIndex[1]}
                canRenderTrajectory={canRenderOverlayByIndex[1]}
                trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                showPose={showPose}
                onVideoMetadataLoad={(metadata) => setVideoDimensionsByIndex((prev) => [prev[0], metadata])}
            />
        </>
    ), [
        canRenderOverlayByIndex,
        overlayMetadataByIndex,
        sources,
        trajectoryByIndex,
        trajectoryWarningsByIndex,
        videoUrls,
    ]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm">
            <div className="h-full w-full p-4 lg:p-6">
                <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl dark:bg-black">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="absolute right-6 top-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/80"
                        aria-label="Close replay comparison"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <ReplayComparisonWorkspace
                        splitViewContent={splitViewContent}
                        videoRefs={videoRefs}
                        videoUrls={videoUrls}
                        overlayMetadataByIndex={overlayMetadataByIndex}
                        canRenderOverlayByIndex={canRenderOverlayByIndex}
                        availableTrajectoryTrackNames={availableTrajectoryTrackNames}
                        hasAnyOverlayData={hasAnyOverlayData}
                        hasPoseMetadata={hasPoseMetadata}
                        storageKey={resolvedStorageKey}
                        title={title}
                        showRemoveVideos={false}
                        onKeyMomentsChange={onKeyMomentsChange}
                    />
                </div>
            </div>
        </div>
    );
}