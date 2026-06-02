'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface UseVideoControlOptions {
    videoRefs: RefObject<HTMLVideoElement | null>[];
    videoUrls?: (string | null)[];
    direction?: 'left' | 'right' | 'none';
    movement?: number;
    fps?: number | null;
}

type FastSeekableVideo = HTMLVideoElement & { fastSeek?: (time: number) => void };

interface SeekChannelRefs {
    pendingTime: { current: number | null };
    seekRaf: { current: number };
    seekedHooked: { current: boolean };
}

function clampSeekTime(video: HTMLVideoElement, time: number): number {
    if (!Number.isFinite(time)) {
        return 0;
    }
    const duration = Number.isFinite(video.duration) ? video.duration : time;
    return Math.max(0, Math.min(time, duration));
}

/** Prefer fastSeek during coalesced scrubbing when the browser supports it. */
function performVideoSeek(video: HTMLVideoElement, time: number, preferFastSeek: boolean): void {
    const clamped = clampSeekTime(video, time);
    if (preferFastSeek && typeof (video as FastSeekableVideo).fastSeek === 'function') {
        try {
            (video as FastSeekableVideo).fastSeek!(clamped);
            return;
        } catch {
            // Unsupported for this media — fall through to currentTime.
        }
    }
    video.currentTime = clamped;
}

/**
 * Applies the latest pending seek. If the decoder is still busy, waits for `seeked`
 * before applying again so the queue does not grow without bound.
 */
function flushVideoSeek(
    getVideo: () => HTMLVideoElement | null,
    refs: SeekChannelRefs,
): void {
    const video = getVideo();
    if (!video || refs.pendingTime.current === null) {
        return;
    }

    if (video.seeking) {
        if (!refs.seekedHooked.current) {
            refs.seekedHooked.current = true;
            const onSeeked = () => {
                refs.seekedHooked.current = false;
                flushVideoSeek(getVideo, refs);
            };
            video.addEventListener('seeked', onSeeked, { once: true });
        }
        return;
    }

    const target = refs.pendingTime.current;
    refs.pendingTime.current = null;
    performVideoSeek(video, target, true);

    const videoAfter = getVideo();
    if (!videoAfter || refs.pendingTime.current === null) {
        return;
    }

    if (videoAfter.seeking) {
        if (!refs.seekedHooked.current) {
            refs.seekedHooked.current = true;
            videoAfter.addEventListener('seeked', () => {
                refs.seekedHooked.current = false;
                flushVideoSeek(getVideo, refs);
            }, { once: true });
        }
        return;
    }

    flushVideoSeek(getVideo, refs);
}

function scheduleVideoSeek(
    getVideo: () => HTMLVideoElement | null,
    refs: SeekChannelRefs,
    newTime: number,
): void {
    refs.pendingTime.current = newTime;
    if (!refs.seekRaf.current) {
        refs.seekRaf.current = requestAnimationFrame(() => {
            refs.seekRaf.current = 0;
            flushVideoSeek(getVideo, refs);
        });
    }
}

export function useVideoControl({
    videoRefs,
    videoUrls = [],
    direction = 'none',
    movement = 0,
    fps = null,
}: UseVideoControlOptions) {
    const [currentTime1, setCurrentTime1] = useState<number>(0);
    const [currentTime2, setCurrentTime2] = useState<number>(0);
    const [duration1, setDuration1] = useState<number>(0);
    const [duration2, setDuration2] = useState<number>(0);

    const channel1: SeekChannelRefs = {
        pendingTime: useRef<number | null>(null),
        seekRaf: useRef(0),
        seekedHooked: useRef(false),
    };
    const channel2: SeekChannelRefs = {
        pendingTime: useRef<number | null>(null),
        seekRaf: useRef(0),
        seekedHooked: useRef(false),
    };

    const getVideo1 = useCallback(() => videoRefs[0]?.current ?? null, [videoRefs]);
    const getVideo2 = useCallback(() => videoRefs[1]?.current ?? null, [videoRefs]);

    useEffect(() => () => {
        cancelAnimationFrame(channel1.seekRaf.current);
        cancelAnimationFrame(channel2.seekRaf.current);
    }, []);

    useEffect(() => {
        channel1.pendingTime.current = null;
        channel1.seekedHooked.current = false;
        channel2.pendingTime.current = null;
        channel2.seekedHooked.current = false;
    }, [videoUrls]);

    const seekTo1 = useCallback((newTime: number) => {
        if (!getVideo1()) return;
        setCurrentTime1(newTime);
        scheduleVideoSeek(getVideo1, channel1, newTime);
    }, [getVideo1]);

    const seekTo2 = useCallback((newTime: number) => {
        if (!getVideo2()) return;
        setCurrentTime2(newTime);
        scheduleVideoSeek(getVideo2, channel2, newTime);
    }, [getVideo2]);

    useEffect(() => {
        if (direction === 'none') return;

        const video = videoRefs[0]?.current ?? null;
        const video2 = videoRefs[1]?.current ?? null;
        if (!video && !video2) return;

        const seekAmount = fps ? 1 / fps : 1 / 30;
        const delta = direction === 'right' ? seekAmount : -seekAmount;

        // Frame-step uses a precise seek (not fastSeek) and bypasses the scrub queue.
        if (video && video.duration) {
            let newTime = video.currentTime + delta;
            newTime = Math.max(0, Math.min(newTime, video.duration));
            channel1.pendingTime.current = null;
            performVideoSeek(video, newTime, false);
            setCurrentTime1(newTime);
        }

        if (video2 && video2.duration) {
            let newTime = video2.currentTime + delta;
            newTime = Math.max(0, Math.min(newTime, video2.duration));
            channel2.pendingTime.current = null;
            performVideoSeek(video2, newTime, false);
            setCurrentTime2(newTime);
        }
    }, [direction, movement, fps, videoRefs]);

    useEffect(() => {
        const video = videoRefs[0]?.current ?? null;
        const video2 = videoRefs[1]?.current ?? null;
        if (!video && !video2) return;

        const updateTime1 = () => {
            if (video) setCurrentTime1(video.currentTime);
        };

        const updateTime2 = () => {
            if (video2) setCurrentTime2(video2.currentTime);
        };

        const updateDuration1 = () => {
            if (video) setDuration1(video.duration);
        };

        const updateDuration2 = () => {
            if (video2) setDuration2(video2.duration);
        };

        if (video) {
            video.addEventListener('timeupdate', updateTime1);
            video.addEventListener('loadedmetadata', updateDuration1);
            video.addEventListener('seeked', updateTime1);
        }

        if (video2) {
            video2.addEventListener('timeupdate', updateTime2);
            video2.addEventListener('loadedmetadata', updateDuration2);
            video2.addEventListener('seeked', updateTime2);
        }

        return () => {
            if (video) {
                video.removeEventListener('timeupdate', updateTime1);
                video.removeEventListener('loadedmetadata', updateDuration1);
                video.removeEventListener('seeked', updateTime1);
            }
            if (video2) {
                video2.removeEventListener('timeupdate', updateTime2);
                video2.removeEventListener('loadedmetadata', updateDuration2);
                video2.removeEventListener('seeked', updateTime2);
            }
        };
    }, [videoRefs, videoUrls]);

    return {
        currentTime1,
        currentTime2,
        duration1,
        duration2,
        fps,
        seekTo1,
        seekTo2,
    };
}
