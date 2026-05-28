export type VideoIndex = 0 | 1;

export interface VideoSourceIdentity {
    fileName: string;
    fileSize: number;
    lastModified: number;
    mimeType: string;
}

export interface KeyMomentPosition {
    time: number;
    frame: number;
}

export interface KeyMoment {
    id: string;
    positions: [KeyMomentPosition | null, KeyMomentPosition | null];
}

const DEFAULT_FPS = 30;

export const getFrameAtTime = (time: number, fps: number | null) => Math.max(0, Math.round(time * (fps ?? DEFAULT_FPS)));

export const buildKeyMomentPosition = (time: number, fps: number | null): KeyMomentPosition => ({
    time,
    frame: getFrameAtTime(time, fps),
});

export const formatVideoTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const KEY_MOMENT_STORAGE_PREFIX = 'replay:key-moments:v1';

export const getVideoSourceFingerprint = (videoSource: VideoSourceIdentity | null) => {
    if (!videoSource) {
        return 'empty';
    }

    return [
        videoSource.fileName,
        videoSource.fileSize,
        videoSource.lastModified,
        videoSource.mimeType,
    ].join('::');
};

export const getKeyMomentStorageKey = (videoSources: [VideoSourceIdentity | null, VideoSourceIdentity | null]) => {
    if (!videoSources[0] && !videoSources[1]) {
        return null;
    }

    return `${KEY_MOMENT_STORAGE_PREFIX}:${getVideoSourceFingerprint(videoSources[0])}__${getVideoSourceFingerprint(videoSources[1])}`;
};

export interface KeyMomentEditorState {
    keyMoments: KeyMoment[];
    selectedKeyMomentId: string | null;
}

interface PersistedKeyMomentState {
    version: 1;
    keyMoments: KeyMoment[];
    selectedKeyMomentId: string | null;
}

const EMPTY_KEY_MOMENT_EDITOR_STATE: KeyMomentEditorState = {
    keyMoments: [],
    selectedKeyMomentId: null,
};

const isKeyMomentPosition = (value: unknown): value is KeyMomentPosition => {
    return typeof value === 'object'
        && value !== null
        && 'time' in value
        && 'frame' in value
        && typeof value.time === 'number'
        && Number.isFinite(value.time)
        && typeof value.frame === 'number'
        && Number.isFinite(value.frame);
};

const isKeyMoment = (value: unknown): value is KeyMoment => {
    return typeof value === 'object'
        && value !== null
        && 'id' in value
        && typeof value.id === 'string'
        && 'positions' in value
        && Array.isArray(value.positions)
        && value.positions.length === 2
        && value.positions.every((position) => position === null || isKeyMomentPosition(position));
};

const parsePersistedKeyMomentState = (rawValue: string): KeyMomentEditorState | null => {
    try {
        const parsedValue: unknown = JSON.parse(rawValue);
        if (
            typeof parsedValue !== 'object'
            || parsedValue === null
            || !('version' in parsedValue)
            || parsedValue.version !== 1
            || !('keyMoments' in parsedValue)
            || !Array.isArray(parsedValue.keyMoments)
            || !parsedValue.keyMoments.every(isKeyMoment)
            || !('selectedKeyMomentId' in parsedValue)
            || (parsedValue.selectedKeyMomentId !== null && typeof parsedValue.selectedKeyMomentId !== 'string')
        ) {
            return null;
        }

        return {
            keyMoments: parsedValue.keyMoments,
            selectedKeyMomentId: parsedValue.selectedKeyMomentId,
        };
    } catch {
        return null;
    }
};

export const readKeyMomentEditorState = (persistenceKey: string | null): KeyMomentEditorState => {
    if (!persistenceKey || typeof window === 'undefined') {
        return EMPTY_KEY_MOMENT_EDITOR_STATE;
    }

    return parsePersistedKeyMomentState(window.localStorage.getItem(persistenceKey) ?? '')
        ?? EMPTY_KEY_MOMENT_EDITOR_STATE;
};

export const writeKeyMomentEditorState = (
    persistenceKey: string | null,
    state: KeyMomentEditorState,
): void => {
    if (!persistenceKey || typeof window === 'undefined') {
        return;
    }

    const payload: PersistedKeyMomentState = {
        version: 1,
        keyMoments: state.keyMoments,
        selectedKeyMomentId: state.selectedKeyMomentId,
    };

    window.localStorage.setItem(persistenceKey, JSON.stringify(payload));
};

export const resolveActivePlaybackSliderIndex = (
    choice: VideoIndex | null,
    hasVideoByIndex: [boolean, boolean],
): VideoIndex | null => {
    if (choice === 0) {
        if (hasVideoByIndex[0]) {
            return 0;
        }
        return hasVideoByIndex[1] ? 1 : null;
    }

    if (choice === 1) {
        if (hasVideoByIndex[1]) {
            return 1;
        }
        return hasVideoByIndex[0] ? 0 : null;
    }

    if (hasVideoByIndex[0]) {
        return 0;
    }

    if (hasVideoByIndex[1]) {
        return 1;
    }

    return null;
};