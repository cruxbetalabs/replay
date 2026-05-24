'use client';

import { useCallback, useMemo, useState } from 'react';
import type { VideoIndex } from '../lib/key-moments';
import { getTrajectoryCompatibilityWarnings, getTrajectoryDimensionMismatchWarnings, getTrajectoryDurationMismatchWarning } from '../lib/trajectory-compatibility';
import { parseTrajectoryMetadata } from '../lib/trajectory-parser';
import type { TrajectoryMetadata, VideoDimensions } from '../lib/trajectory-types';

export interface UploadedTrajectoryState {
    fileName: string | null;
    metadata: TrajectoryMetadata | null;
    warnings: string[];
    error: string | null;
}

interface UseTrajectoryStateOptions {
    hasVideoByIndex: [boolean, boolean];
}

const createEmptyTrajectoryState = (): UploadedTrajectoryState => ({
    fileName: null,
    metadata: null,
    warnings: [],
    error: null,
});

const appendUniqueWarning = (warnings: string[], warning: string): string[] => (
    warnings.includes(warning) ? warnings : [...warnings, warning]
);

export function useTrajectoryState({ hasVideoByIndex }: UseTrajectoryStateOptions) {
    const [trajectoryByIndex, setTrajectoryByIndex] = useState<[UploadedTrajectoryState, UploadedTrajectoryState]>([
        createEmptyTrajectoryState(),
        createEmptyTrajectoryState(),
    ]);
    const [videoDimensionsByIndex, setVideoDimensionsByIndex] = useState<[VideoDimensions | null, VideoDimensions | null]>([
        null,
        null,
    ]);

    const setTrajectoryState = useCallback((videoIndex: VideoIndex, nextState: UploadedTrajectoryState) => {
        setTrajectoryByIndex((prev) => {
            const nextTrajectoryByIndex: [UploadedTrajectoryState, UploadedTrajectoryState] = [...prev] as [UploadedTrajectoryState, UploadedTrajectoryState];
            nextTrajectoryByIndex[videoIndex] = nextState;
            return nextTrajectoryByIndex;
        });
    }, []);

    const handleTrajectoryFile = useCallback(async (videoIndex: VideoIndex, file: File): Promise<{ error?: string; warnings?: string[] }> => {
        try {
            const rawText = await file.text();
            const { metadata, warnings } = parseTrajectoryMetadata(rawText);

            const durationMismatchWarning = getTrajectoryDurationMismatchWarning(
                metadata,
                videoDimensionsByIndex[videoIndex],
            );
            const mergedWarnings = durationMismatchWarning
                ? appendUniqueWarning(warnings, durationMismatchWarning)
                : warnings;

            setTrajectoryState(videoIndex, {
                fileName: file.name,
                metadata,
                warnings: mergedWarnings,
                error: null,
            });
            return mergedWarnings.length > 0 ? { warnings: mergedWarnings } : {};
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unable to parse trajectory metadata.';
            setTrajectoryState(videoIndex, {
                fileName: file.name,
                metadata: null,
                warnings: [],
                error: errorMessage,
            });
            return { error: errorMessage };
        }
    }, [setTrajectoryState, videoDimensionsByIndex]);

    const handleTrajectoryUpload = useCallback((videoIndex: VideoIndex, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        void handleTrajectoryFile(videoIndex, file);
    }, [handleTrajectoryFile]);

    const clearTrajectory = useCallback((videoIndex: VideoIndex) => {
        setTrajectoryState(videoIndex, createEmptyTrajectoryState());
    }, [setTrajectoryState]);

    const updateVideoDimensions = useCallback((videoIndex: VideoIndex, dimensions: VideoDimensions) => {
        setVideoDimensionsByIndex((prev) => {
            const nextVideoDimensions: [VideoDimensions | null, VideoDimensions | null] = [...prev] as [VideoDimensions | null, VideoDimensions | null];
            nextVideoDimensions[videoIndex] = dimensions;
            return nextVideoDimensions;
        });

        setTrajectoryByIndex((prev) => {
            const current = prev[videoIndex];
            if (!current.metadata) {
                return prev;
            }

            const durationMismatchWarning = getTrajectoryDurationMismatchWarning(current.metadata, dimensions);
            if (!durationMismatchWarning) {
                return prev;
            }

            const nextTrajectoryByIndex: [UploadedTrajectoryState, UploadedTrajectoryState] = [...prev] as [UploadedTrajectoryState, UploadedTrajectoryState];
            nextTrajectoryByIndex[videoIndex] = {
                ...current,
                warnings: appendUniqueWarning(current.warnings, durationMismatchWarning),
            };
            return nextTrajectoryByIndex;
        });
    }, []);

    const clearVideoDimensions = useCallback((videoIndex: VideoIndex) => {
        setVideoDimensionsByIndex((prev) => {
            const nextVideoDimensions: [VideoDimensions | null, VideoDimensions | null] = [...prev] as [VideoDimensions | null, VideoDimensions | null];
            nextVideoDimensions[videoIndex] = null;
            return nextVideoDimensions;
        });
    }, []);

    const overlayMetadataByIndex = useMemo<[TrajectoryMetadata | null, TrajectoryMetadata | null]>(() => [
        trajectoryByIndex[0].metadata,
        trajectoryByIndex[1].metadata,
    ], [trajectoryByIndex]);

    const hasAnyOverlayData = overlayMetadataByIndex.some(Boolean);
    const hasPoseMetadata = overlayMetadataByIndex.some((metadata) => metadata?.pose != null);

    const availableTrajectoryTrackNames = useMemo(() => Array.from(new Set(
        trajectoryByIndex.flatMap((trajectoryState) => Object.keys(trajectoryState.metadata?.tracks ?? {})),
    )).sort((left, right) => left.localeCompare(right)), [trajectoryByIndex]);

    const trajectoryWarningsByIndex: [string[], string[]] = useMemo(() => [0, 1].map((index) => {
        const trajectoryState = trajectoryByIndex[index as VideoIndex];
        return [
            ...trajectoryState.warnings,
            ...getTrajectoryCompatibilityWarnings(trajectoryState.metadata, videoDimensionsByIndex[index as VideoIndex]),
        ];
    }) as [string[], string[]], [trajectoryByIndex, videoDimensionsByIndex]);

    const canRenderOverlayByIndex: [boolean, boolean] = useMemo(() => [0, 1].map((index) => {
        const overlayMetadata = overlayMetadataByIndex[index as VideoIndex];
        if (!overlayMetadata) {
            return false;
        }

        if (!hasVideoByIndex[index as VideoIndex]) {
            return true;
        }

        return getTrajectoryDimensionMismatchWarnings(
            overlayMetadata,
            videoDimensionsByIndex[index as VideoIndex],
        ).length === 0;
    }) as [boolean, boolean], [hasVideoByIndex, overlayMetadataByIndex, videoDimensionsByIndex]);

    return {
        trajectoryByIndex,
        overlayMetadataByIndex,
        trajectoryWarningsByIndex,
        canRenderOverlayByIndex,
        availableTrajectoryTrackNames,
        hasAnyOverlayData,
        hasPoseMetadata,
        handleTrajectoryUpload,
        handleTrajectoryFile,
        clearTrajectory,
        updateVideoDimensions,
        clearVideoDimensions,
    };
}