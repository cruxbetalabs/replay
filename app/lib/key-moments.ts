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