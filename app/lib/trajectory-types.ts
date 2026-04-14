export interface VideoDimensions {
    width: number;
    height: number;
    durationSeconds: number | null;
}

export interface TrajectoryPoint {
    x: number;
    y: number;
}

export interface TrajectoryVector2D {
    dx: number;
    dy: number;
}

export interface PoseLandmark {
    x: number;
    y: number;
    z: number | null;
    visibility: number | null;
    presence: number | null;
}

export interface PoseFrame {
    frameIndex: number;
    timestampSeconds: number;
    landmarks: Array<PoseLandmark | null> | null;
}

export interface PoseMetadata {
    landmarkModel: string;
    landmarkCount: number;
    landmarkNames: string[];
    renderLandmarksSource: string;
    coordinateSpace: {
        width: number;
        height: number;
    };
    skeletonConnections: Array<[number, number]>;
    frames: PoseFrame[];
}

export interface VelocityColorPreset {
    colorSpace: string;
    interpolation: string;
    slowBgr: [number, number, number];
    midBgr: [number, number, number];
    fastBgr: [number, number, number];
}

export interface TrajectorySample {
    frameIndex: number;
    timestampSeconds: number;
    point: TrajectoryPoint | null;
    velocityRatio: number | null;
    velocityVector2D: TrajectoryVector2D | null;
    velocityVector2DPerSecond: TrajectoryVector2D | null;
}

export interface TrajectoryTrack {
    velocityColorPreset: string | null;
    samples: TrajectorySample[];
}

export interface TrajectoryMetadata {
    schemaVersion: string;
    sourceVideo: {
        width: number;
        height: number;
        fps: number;
        frameCount: number;
    };
    coordinateSpace: {
        type: string;
        origin: string;
        xAxis: string;
        yAxis: string;
        width: number;
        height: number;
    };
    style: {
        defaultVelocityColorPreset: string;
        velocityColorPresets: Record<string, VelocityColorPreset>;
    };
    tracks: Record<string, TrajectoryTrack>;
    pose: PoseMetadata | null;
}