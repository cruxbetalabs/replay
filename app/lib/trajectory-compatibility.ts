import type { TrajectoryMetadata, VideoDimensions } from './trajectory-types';

const getTrajectoryDurationSeconds = (metadata: TrajectoryMetadata) => (
    metadata.sourceVideo.fps > 0
        ? metadata.sourceVideo.frameCount / metadata.sourceVideo.fps
        : null
);

export const getTrajectoryDurationMismatchWarning = (
    metadata: TrajectoryMetadata | null,
    videoDimensions: VideoDimensions | null,
): string | null => {
    if (!metadata || !videoDimensions) {
        return null;
    }

    const metadataDurationSeconds = getTrajectoryDurationSeconds(metadata);
    const videoDurationSeconds = videoDimensions.durationSeconds;

    if (
        metadataDurationSeconds == null
        || !Number.isFinite(metadataDurationSeconds)
        || videoDurationSeconds == null
        || !Number.isFinite(videoDurationSeconds)
        || videoDurationSeconds <= 0
    ) {
        return null;
    }

    const durationToleranceSeconds = Math.max(0.1, 2 / metadata.sourceVideo.fps);
    if (Math.abs(metadataDurationSeconds - videoDurationSeconds) <= durationToleranceSeconds) {
        return null;
    }

    return `Trajectory duration ${metadataDurationSeconds.toFixed(2)}s does not match video duration ${videoDurationSeconds.toFixed(2)}s.`;
};

export const getTrajectoryDimensionMismatchWarnings = (
    metadata: TrajectoryMetadata | null,
    videoDimensions: VideoDimensions | null,
): string[] => {
    if (!metadata || !videoDimensions) {
        return [];
    }

    if (
        metadata.sourceVideo.width !== videoDimensions.width
        || metadata.sourceVideo.height !== videoDimensions.height
    ) {
        return [
            `Trajectory source dimensions ${metadata.sourceVideo.width}x${metadata.sourceVideo.height} do not match video dimensions ${videoDimensions.width}x${videoDimensions.height}.`,
        ];
    }

    return [];
};

export const getTrajectoryCompatibilityWarnings = (
    metadata: TrajectoryMetadata | null,
    videoDimensions: VideoDimensions | null,
): string[] => {
    if (!metadata || !videoDimensions) {
        return [];
    }

    const warnings = getTrajectoryDimensionMismatchWarnings(metadata, videoDimensions);

    const durationMismatchWarning = getTrajectoryDurationMismatchWarning(metadata, videoDimensions);
    if (durationMismatchWarning) {
        warnings.push(durationMismatchWarning);
    }

    return warnings;
};

export const isTrajectoryCompatibleWithVideo = (
    metadata: TrajectoryMetadata | null,
    videoDimensions: VideoDimensions | null,
) => getTrajectoryCompatibilityWarnings(metadata, videoDimensions).length === 0;