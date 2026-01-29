'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';

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
        setFpsByIndex((prev) => {
            if (prev.length === videoRefs.length) return prev;
            return videoRefs.map((_, index) => prev[index] ?? null);
        });

        setCalculatingByIndex((prev) => {
            if (prev.length === videoRefs.length) return prev;
            return videoRefs.map((_, index) => prev[index] ?? false);
        });
    }, [videoRefs.length]);

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
                    (video as any).requestVideoFrameCallback(countFrames);
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
                                (video as any).requestVideoFrameCallback(countFrames);
                            })
                            .catch(() => {
                                finish(defaultFps);
                            });
                    } else {
                        (video as any).requestVideoFrameCallback(countFrames);
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

    const fps = useMemo(() => {
        for (const value of fpsByIndex) {
            if (value !== null) return value;
        }
        return null;
    }, [fpsByIndex]);

    const isCalculating = useMemo(() => calculatingByIndex.some(Boolean), [calculatingByIndex]);

    return {
        fps,
        fpsByIndex,
        isCalculating,
        calculatingByIndex,
    };
}
