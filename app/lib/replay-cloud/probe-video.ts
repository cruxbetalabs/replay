import { MAX_CLOUD_DURATION_SECONDS, MAX_CLOUD_UPLOAD_BYTES } from './constants';

export interface VideoProbeResult {
    durationSeconds: number;
    width: number;
    height: number;
}

const SUPPORTED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime']);

export function isSupportedCloudVideo(file: File): boolean {
    return (
        SUPPORTED_VIDEO_TYPES.has(file.type)
        || /\.(mp4|mov)$/i.test(file.name)
    );
}

export function validateCloudVideoFile(file: File): string | null {
    if (!isSupportedCloudVideo(file)) {
        return 'Supported formats: .mp4 and .mov';
    }
    if (file.size > MAX_CLOUD_UPLOAD_BYTES) {
        return 'Video exceeds the 500 MB upload limit.';
    }
    return null;
}

export async function probeCloudVideoFile(file: File): Promise<VideoProbeResult> {
    const staticError = validateCloudVideoFile(file);
    if (staticError) {
        throw new Error(staticError);
    }

    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);

        const cleanup = () => {
            URL.revokeObjectURL(url);
            video.src = '';
        };

        const timeout = window.setTimeout(() => {
            cleanup();
            reject(new Error('Video took too long to load.'));
        }, 15_000);

        video.onloadedmetadata = () => {
            window.clearTimeout(timeout);
            const durationSeconds = video.duration;
            cleanup();

            if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
                reject(new Error('Could not read video duration.'));
                return;
            }
            if (durationSeconds > MAX_CLOUD_DURATION_SECONDS) {
                reject(new Error(`Video exceeds the ${MAX_CLOUD_DURATION_SECONDS / 60}-minute limit.`));
                return;
            }

            resolve({
                durationSeconds,
                width: video.videoWidth,
                height: video.videoHeight,
            });
        };

        video.onerror = () => {
            window.clearTimeout(timeout);
            cleanup();
            reject(new Error('Cannot read video. The format may not be supported or the file is corrupted.'));
        };

        video.preload = 'metadata';
        video.src = url;
    });
}
