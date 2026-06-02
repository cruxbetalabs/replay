import { getVideoSourceFingerprint, type VideoSourceIdentity } from './key-moments';
import type { VideoIndex } from './key-moments';

export const DEFAULT_ANNOTATION_DURATION_SEC = 1;
export const MIN_ANNOTATION_DURATION_SEC = 1 / 120;

/** Matches tldraw toolbar presets (S / M / L / XL) for stroke and text size. */
export type AnnotationSizeStyle = 's' | 'm' | 'l' | 'xl';

/**
 * Picks a tldraw size preset from video pixel dimensions so strokes and labels stay
 * legible on the stage (sizes are in video-native coordinates, not screen pixels).
 */
export const getAnnotationSizeForVideoDimensions = (
    videoWidth: number,
    videoHeight: number,
): AnnotationSizeStyle => {
    if (videoWidth <= 0 || videoHeight <= 0) {
        return 'm';
    }

    const shortEdge = Math.min(videoWidth, videoHeight);

    if (shortEdge <= 480) {
        return 's';
    }
    if (shortEdge <= 720) {
        return 'm';
    }
    if (shortEdge <= 1200) {
        return 'l';
    }
    return 'xl';
};

export interface AnnotationTiming {
    startTime: number;
    endTime: number;
}

export interface VideoAnnotationBundle {
    enabled: boolean;
    onToggleEnabled: () => void;
    currentTime: number;
    duration: number;
    fps: number | null;
    seekAmount: number;
    onSeek: (time: number) => void;
    shapeTimings: Record<string, AnnotationTiming>;
    onShapeTimingsChange: (shapeTimings: Record<string, AnnotationTiming>) => void;
}

export interface VideoAnnotationEditorState {
    enabledByIndex: [boolean, boolean];
    shapeTimingsByIndex: [Record<string, AnnotationTiming>, Record<string, AnnotationTiming>];
}

const ANNOTATION_STORAGE_PREFIX = 'replay:annotations:v1';

const EMPTY_SHAPE_TIMINGS: Record<string, AnnotationTiming> = {};

const EMPTY_EDITOR_STATE: VideoAnnotationEditorState = {
    enabledByIndex: [false, false],
    shapeTimingsByIndex: [{ ...EMPTY_SHAPE_TIMINGS }, { ...EMPTY_SHAPE_TIMINGS }],
};

export const snapTimeToFrame = (time: number, fps: number | null) => {
    const frameDuration = fps ? 1 / fps : 1 / 30;
    return Math.max(0, Math.round(time / frameDuration) * frameDuration);
};

export const clampAnnotationTiming = (
    timing: AnnotationTiming,
    duration: number,
    fps: number | null,
): AnnotationTiming => {
    if (duration <= 0) {
        return { startTime: 0, endTime: 0 };
    }

    const frameStep = fps ? 1 / fps : 1 / 30;
    let startTime = snapTimeToFrame(Math.max(0, timing.startTime), fps);
    let endTime = snapTimeToFrame(Math.min(duration, timing.endTime), fps);

    if (endTime <= startTime) {
        endTime = snapTimeToFrame(Math.min(duration, startTime + frameStep), fps);
    }

    const maxEnd = duration;
    if (endTime > maxEnd) {
        endTime = snapTimeToFrame(maxEnd, fps);
    }

    if (endTime <= startTime) {
        startTime = snapTimeToFrame(Math.max(0, endTime - frameStep), fps);
    }

    return { startTime, endTime };
};

export const buildDefaultAnnotationTiming = (
    currentTime: number,
    duration: number,
    fps: number | null,
): AnnotationTiming => {
    const startTime = snapTimeToFrame(currentTime, fps);
    const idealEnd = startTime + DEFAULT_ANNOTATION_DURATION_SEC;
    return clampAnnotationTiming({ startTime, endTime: idealEnd }, duration, fps);
};

export const isAnnotationVisibleAtTime = (timing: AnnotationTiming, currentTime: number) => (
    currentTime >= timing.startTime && currentTime <= timing.endTime
);

export const getAnnotationStorageKey = (
    videoSources: [VideoSourceIdentity | null, VideoSourceIdentity | null],
) => {
    if (!videoSources[0] && !videoSources[1]) {
        return null;
    }

    return `${ANNOTATION_STORAGE_PREFIX}:${getVideoSourceFingerprint(videoSources[0])}__${getVideoSourceFingerprint(videoSources[1])}`;
};

export const getTldrawPersistenceKey = (
    storageKey: string | null,
    videoIndex: VideoIndex,
) => (storageKey ? `${storageKey}:tldraw:${videoIndex}` : null);

interface PersistedAnnotationState {
    version: 1;
    enabledByIndex: [boolean, boolean];
    shapeTimingsByIndex: [Record<string, AnnotationTiming>, Record<string, AnnotationTiming>];
}

const isAnnotationTiming = (value: unknown): value is AnnotationTiming => (
    typeof value === 'object'
    && value !== null
    && 'startTime' in value
    && 'endTime' in value
    && typeof value.startTime === 'number'
    && Number.isFinite(value.startTime)
    && typeof value.endTime === 'number'
    && Number.isFinite(value.endTime)
);

const isShapeTimingMap = (value: unknown): value is Record<string, AnnotationTiming> => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    return Object.values(value).every(isAnnotationTiming);
};

const parsePersistedAnnotationState = (rawValue: string): VideoAnnotationEditorState | null => {
    try {
        const parsedValue: unknown = JSON.parse(rawValue);
        if (
            typeof parsedValue !== 'object'
            || parsedValue === null
            || !('version' in parsedValue)
            || parsedValue.version !== 1
            || !('enabledByIndex' in parsedValue)
            || !Array.isArray(parsedValue.enabledByIndex)
            || parsedValue.enabledByIndex.length !== 2
            || typeof parsedValue.enabledByIndex[0] !== 'boolean'
            || typeof parsedValue.enabledByIndex[1] !== 'boolean'
            || !('shapeTimingsByIndex' in parsedValue)
            || !Array.isArray(parsedValue.shapeTimingsByIndex)
            || parsedValue.shapeTimingsByIndex.length !== 2
            || !isShapeTimingMap(parsedValue.shapeTimingsByIndex[0])
            || !isShapeTimingMap(parsedValue.shapeTimingsByIndex[1])
        ) {
            return null;
        }

        return {
            enabledByIndex: [parsedValue.enabledByIndex[0], parsedValue.enabledByIndex[1]],
            shapeTimingsByIndex: [
                parsedValue.shapeTimingsByIndex[0],
                parsedValue.shapeTimingsByIndex[1],
            ],
        };
    } catch {
        return null;
    }
};

export const readVideoAnnotationState = (persistenceKey: string | null): VideoAnnotationEditorState => {
    if (!persistenceKey || typeof window === 'undefined') {
        return EMPTY_EDITOR_STATE;
    }

    return parsePersistedAnnotationState(window.localStorage.getItem(persistenceKey) ?? '')
        ?? EMPTY_EDITOR_STATE;
};

export const writeVideoAnnotationState = (
    persistenceKey: string | null,
    state: VideoAnnotationEditorState,
): void => {
    if (!persistenceKey || typeof window === 'undefined') {
        return;
    }

    const payload: PersistedAnnotationState = {
        version: 1,
        enabledByIndex: state.enabledByIndex,
        shapeTimingsByIndex: state.shapeTimingsByIndex,
    };

    window.localStorage.setItem(persistenceKey, JSON.stringify(payload));
};
