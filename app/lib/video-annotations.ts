import { getVideoSourceFingerprint, type VideoSourceIdentity } from './key-moments';
import type { VideoIndex } from './key-moments';

/** Legacy default when duration is unknown — prefer spanning to end of video. */
export const DEFAULT_ANNOTATION_DURATION_SEC = 1;
export const MIN_ANNOTATION_DURATION_SEC = 1 / 120;

export const REPLAY_TIMING_META_KEY = 'replayTiming';

export interface ReplayTimingMeta {
    startTime: number;
    endTime: number;
}

/** Matches tldraw toolbar presets (S / M / L / XL) for stroke and text size. */
export type AnnotationSizeStyle = 's' | 'm' | 'l' | 'xl';

/**
 * Picks a tldraw size preset from the **stage canvas** (displayed video area in CSS px).
 * Annotations use stage coordinates, not source video pixels, so stroke weight stays
 * consistent across 720p, 1080p, 4K, etc. when the on-screen stage size is similar.
 */
export const getAnnotationSizeForStageDimensions = (
    _stageWidth: number,
    _stageHeight: number,
): AnnotationSizeStyle => 'm';

/** Smaller than stroke size — text reads large at the same tldraw preset. */
export const getAnnotationTextSizeForStageDimensions = (
    _stageWidth: number,
    _stageHeight: number,
): AnnotationSizeStyle => 'm';

/** Text scale for tldraw text shapes based on stage short edge (CSS px). */
export const getAnnotationTextScaleForStage = (
    stageWidth: number,
    stageHeight: number,
): number => {
    if (stageWidth <= 0 || stageHeight <= 0) {
        return 0.85;
    }

    const shortEdge = Math.min(stageWidth, stageHeight);
    return Math.max(0.75, Math.min(1.25, shortEdge / 450));
};

/** @deprecated Use getAnnotationSizeForStageDimensions — page coords are stage-sized, not video-native. */
export const getAnnotationSizeForVideoDimensions = getAnnotationSizeForStageDimensions;

/** @deprecated Use getAnnotationTextScaleForStage */
export const getAnnotationTextScale = getAnnotationTextScaleForStage;

export interface AnnotationTiming {
    startTime: number;
    endTime: number;
}

export interface VideoAnnotationBundle {
    /** Annotate mode: edit tools, visibility, and timing slider for this stage. */
    enabled: boolean;
    onToggleEnabled: () => void;
    currentTime: number;
    duration: number;
    fps: number | null;
    seekAmount: number;
    onSeek: (time: number) => void;
    onSeekCommit?: () => void;
    shapeTimings: Record<string, AnnotationTiming>;
    onShapeTimingsChange: (shapeTimings: Record<string, AnnotationTiming>) => void;
}

export interface VideoAnnotationEditorState {
    /** Per-stage annotate mode (tools on + annotations visible for that stage). */
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

export const hasPlaybackTimeAdvanced = (
    previousTime: number | null,
    nextTime: number,
    fps: number | null,
) => {
    if (previousTime === null) {
        return false;
    }

    const frameStep = fps ? 1 / fps : 1 / 30;
    const previousFrame = snapTimeToFrame(previousTime, fps);
    const nextFrame = snapTimeToFrame(nextTime, fps);
    return Math.abs(nextFrame - previousFrame) >= frameStep * 0.5;
};

export const clampAnnotationTiming = (
    timing: AnnotationTiming,
    duration: number,
    fps: number | null,
): AnnotationTiming => {
    const frameStep = fps ? 1 / fps : 1 / 30;

    if (duration <= 0) {
        const startTime = snapTimeToFrame(Math.max(0, timing.startTime), fps);
        let endTime = snapTimeToFrame(Math.max(startTime, timing.endTime), fps);
        if (endTime <= startTime) {
            endTime = startTime + Math.max(DEFAULT_ANNOTATION_DURATION_SEC, frameStep * 60);
        }
        return { startTime, endTime };
    }

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

/**
 * New shapes stay visible from the frame they were created through the end of the video.
 * Users can shorten the range with the timing handles when a shape is selected.
 */
export const buildDefaultAnnotationTiming = (
    currentTime: number,
    duration: number,
    fps: number | null,
): AnnotationTiming => {
    const startTime = snapTimeToFrame(currentTime, fps);
    const frameStep = fps ? 1 / fps : 1 / 30;

    if (duration <= 0) {
        return {
            startTime,
            endTime: startTime + Math.max(DEFAULT_ANNOTATION_DURATION_SEC, frameStep * 60 * 60),
        };
    }

    return clampAnnotationTiming({ startTime, endTime: duration }, duration, fps);
};

/** Fixes timings saved before duration was known (zero-length windows). */
export const expandBrokenShapeTimings = (
    timings: Record<string, AnnotationTiming>,
    duration: number,
    fps: number | null,
): Record<string, AnnotationTiming> => {
    if (duration <= 0) {
        return timings;
    }

    const frameStep = fps ? 1 / fps : 1 / 30;
    const minVisibleWindow = frameStep * 0.5;
    let changed = false;
    const next = { ...timings };

    Object.entries(next).forEach(([shapeId, timing]) => {
        const windowLength = timing.endTime - timing.startTime;
        if (windowLength > minVisibleWindow) {
            return;
        }

        const repaired = clampAnnotationTiming(
            { startTime: timing.startTime, endTime: duration },
            duration,
            fps,
        );
        next[shapeId] = repaired;
        changed = true;
    });

    return changed ? next : timings;
};

/** Runs legacy repair + broken-window expansion once duration is known. */
export const normalizeShapeTimingsForDuration = (
    timings: Record<string, AnnotationTiming>,
    duration: number,
    fps: number | null,
): Record<string, AnnotationTiming> => (
    expandBrokenShapeTimings(
        repairLegacyShapeTimings(timings, duration, fps),
        duration,
        fps,
    )
);

export const getReplayTimingFromMeta = (meta: unknown): AnnotationTiming | null => {
    if (typeof meta !== 'object' || meta === null || !(REPLAY_TIMING_META_KEY in meta)) {
        return null;
    }

    const candidate = (meta as Record<string, unknown>)[REPLAY_TIMING_META_KEY];
    if (!isAnnotationTiming(candidate)) {
        return null;
    }

    return candidate;
};

/** Prefer app timing store (repaired when duration is known) over stale tldraw shape meta. */
export const resolveShapeTiming = (
    shapeId: string,
    shapeMeta: unknown,
    timingsById: Record<string, AnnotationTiming>,
): AnnotationTiming | null => (
    timingsById[shapeId] ?? getReplayTimingFromMeta(shapeMeta) ?? null
);

export const replayTimingMetaNeedsSync = (
    shapeMeta: unknown,
    timing: AnnotationTiming,
): boolean => {
    const metaTiming = getReplayTimingFromMeta(shapeMeta);
    if (!metaTiming) {
        return true;
    }

    return (
        metaTiming.startTime !== timing.startTime
        || metaTiming.endTime !== timing.endTime
    );
};

export const isAnnotationVisibleAtTime = (
    timing: AnnotationTiming,
    currentTime: number,
    fps: number | null = null,
) => {
    const frameSlop = (fps ? 1 / fps : 1 / 30) * 0.5;
    return (
        currentTime >= timing.startTime - frameSlop
        && currentTime <= timing.endTime + frameSlop
    );
};

export interface ResolveAnnotationVisibilityInput {
    /** When false (annotate mode off), all shapes are hidden. */
    globalVisible: boolean;
    playbackTime: number;
    fps: number | null;
    timing: AnnotationTiming | null;
    isEditing: boolean;
    isSelectedInEditMode: boolean;
}

/** Single place that decides whether a shape should render at the current playback time. */
export const resolveAnnotationShapeVisible = ({
    globalVisible,
    playbackTime,
    fps,
    timing,
    isEditing,
    isSelectedInEditMode,
}: ResolveAnnotationVisibilityInput): boolean => {
    if (!globalVisible) {
        return false;
    }

    if (isEditing || isSelectedInEditMode) {
        return true;
    }

    if (!timing) {
        return true;
    }

    return isAnnotationVisibleAtTime(timing, playbackTime, fps);
};

/** Extends legacy 1s visibility windows so older saved annotations stay visible while scrubbing. */
export const repairLegacyShapeTimings = (
    timings: Record<string, AnnotationTiming>,
    duration: number,
    fps: number | null,
): Record<string, AnnotationTiming> => {
    if (duration <= 0) {
        return timings;
    }

    const frameStep = fps ? 1 / fps : 1 / 30;
    const legacyWindowMax = DEFAULT_ANNOTATION_DURATION_SEC + frameStep;
    let changed = false;
    const next = { ...timings };

    Object.entries(next).forEach(([shapeId, timing]) => {
        const windowLength = timing.endTime - timing.startTime;
        if (windowLength > legacyWindowMax) {
            return;
        }

        const repaired = clampAnnotationTiming(
            { startTime: timing.startTime, endTime: duration },
            duration,
            fps,
        );
        if (
            repaired.startTime !== timing.startTime
            || repaired.endTime !== timing.endTime
        ) {
            next[shapeId] = repaired;
            changed = true;
        }
    });

    return changed ? next : timings;
};

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
) => (storageKey ? `${storageKey}:tldraw:stage:v3:${videoIndex}` : null);

interface PersistedAnnotationState {
    version: 1;
    enabledByIndex: [boolean, boolean];
    /** @deprecated Merged into enabledByIndex — read for migration only */
    annotationsVisible?: boolean;
    /** @deprecated Migrated to enabledByIndex */
    visibleByIndex?: [boolean, boolean];
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

        let enabledByIndex: [boolean, boolean] = [
            parsedValue.enabledByIndex[0],
            parsedValue.enabledByIndex[1],
        ];

        // Legacy: global "hide annotations" meant annotate mode off for all stages.
        let legacyHidden = false;
        if (
            'annotationsVisible' in parsedValue
            && typeof parsedValue.annotationsVisible === 'boolean'
        ) {
            legacyHidden = !parsedValue.annotationsVisible;
        } else {
            const rawVisible = 'visibleByIndex' in parsedValue ? parsedValue.visibleByIndex : undefined;
            if (
                Array.isArray(rawVisible)
                && rawVisible.length === 2
                && typeof rawVisible[0] === 'boolean'
                && typeof rawVisible[1] === 'boolean'
            ) {
                legacyHidden = !(rawVisible[0] || rawVisible[1]);
            }
        }

        if (legacyHidden) {
            enabledByIndex = [false, false];
        }

        return {
            enabledByIndex,
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
