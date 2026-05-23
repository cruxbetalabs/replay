'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';

type VideoWithRVFC = HTMLVideoElement & {
    requestVideoFrameCallback: (cb: () => void) => number;
};

interface UseVideoFpsOptions {
    videoRefs: RefObject<HTMLVideoElement | null>[];
    videoUrls?: (string | null)[];
    sampleDurationMs?: number;
    defaultFps?: number;
}

export function useVideoFps({
    videoRefs,
    videoUrls = [],
    sampleDurationMs = 1000,
    defaultFps = 30,
}: UseVideoFpsOptions) {
    const [fpsByIndex, setFpsByIndex] = useState<(number | null)[]>(() => videoRefs.map(() => null));
    const [calculatingByIndex, setCalculatingByIndex] = useState<boolean[]>(() => videoRefs.map(() => false));

    useEffect(() => {
        const cleanups: Array<() => void> = [];

        videoRefs.forEach((ref, index) => {
            const video = ref.current;
            const url = videoUrls[index] ?? null;

            if (!video || !url) {
                setFpsByIndex((prev) => {
                    const next = [...prev];
                    next[index] = null;
                    return next;
                });
                setCalculatingByIndex((prev) => {
                    const next = [...prev];
                    next[index] = false;
                    return next;
                });
                return;
            }

            let cancelled = false;
            let frameCount = 0;
            let lastTime = 0;

            const finish = (measuredFps: number) => {
                if (cancelled) return;
                setFpsByIndex((prev) => {
                    const next = [...prev];
                    next[index] = measuredFps;
                    return next;
                });
                setCalculatingByIndex((prev) => {
                    const next = [...prev];
                    next[index] = false;
                    return next;
                });

                try {
                    video.pause();
                } catch {
                    // ignore
                }

                try {
                    video.currentTime = 0;
                } catch {
                    // ignore
                }
            };

            const countFrames = () => {
                if (cancelled) return;
                frameCount += 1;
                const current = performance.now();
                const elapsed = current - lastTime;

                if (elapsed >= sampleDurationMs) {
                    const measuredFps = Math.max(1, Math.round(frameCount / (elapsed / 1000)));
                    finish(measuredFps);
                } else {
                    (video as VideoWithRVFC).requestVideoFrameCallback(countFrames);
                }
            };

            const startMeasurement = () => {
                if (cancelled) return;
                setCalculatingByIndex((prev) => {
                    const next = [...prev];
                    next[index] = true;
                    return next;
                });

                video.muted = true;
                video.playsInline = true;
                video.currentTime = 0;

                if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
                    lastTime = performance.now();
                    const playPromise = video.play();
                    if (playPromise && typeof playPromise.then === 'function') {
                        playPromise
                            .then(() => {
                                (video as VideoWithRVFC).requestVideoFrameCallback(countFrames);
                            })
                            .catch(() => {
                                finish(defaultFps);
                            });
                    } else {
                        (video as VideoWithRVFC).requestVideoFrameCallback(countFrames);
                    }
                } else {
                    finish(defaultFps);
                }
            };

            const handleLoadedMetadata = () => {
                startMeasurement();
            };

            if (video.readyState >= 1) {
                handleLoadedMetadata();
            } else {
                video.addEventListener('loadedmetadata', handleLoadedMetadata);
                cleanups.push(() => video.removeEventListener('loadedmetadata', handleLoadedMetadata));
            }

            cleanups.push(() => {
                cancelled = true;
            });
        });

        return () => {
            cleanups.forEach((cleanup) => cleanup());
        };
    }, [videoRefs, videoUrls, sampleDurationMs, defaultFps]);

    const videoCount = videoRefs.length;

    const normalizedFpsByIndex = useMemo(
        () => Array.from({ length: videoCount }, (_, index) => fpsByIndex[index] ?? null),
        [fpsByIndex, videoCount],
    );

    const normalizedCalculatingByIndex = useMemo(
        () => Array.from({ length: videoCount }, (_, index) => calculatingByIndex[index] ?? false),
        [calculatingByIndex, videoCount],
    );

    const fps = useMemo(() => {
        for (const value of normalizedFpsByIndex) {
            if (value !== null) return value;
        }
        return null;
    }, [normalizedFpsByIndex]);

    return {
        fps,
        fpsByIndex: normalizedFpsByIndex,
        calculatingByIndex: normalizedCalculatingByIndex,
    };
}
