'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { shouldUseFastSeekForScrubbing } from '../lib/video-seek';
import { snapTimeToFrame } from '../lib/video-annotations';

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
    lastRequestedTime: { current: number };
    lastAppliedTime: { current: number | null };
}

function clampSeekTime(video: HTMLVideoElement, time: number): number {
    if (!Number.isFinite(time)) {
        return 0;
    }
    const duration = Number.isFinite(video.duration) ? video.duration : time;
    return Math.max(0, Math.min(time, duration));
}

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

function resolveSeekTarget(
    video: HTMLVideoElement,
    time: number,
    fps: number | null,
    useFastSeek: boolean,
): number {
    return useFastSeek ? clampSeekTime(video, time) : snapTimeToFrame(time, fps);
}

function scheduleSeekFollowUp(
    getVideo: () => HTMLVideoElement | null,
    refs: SeekChannelRefs,
    fps: number | null,
    useFastSeek: boolean,
    flush: () => void,
): void {
    if (refs.pendingTime.current !== null && !refs.seekRaf.current) {
        refs.seekRaf.current = requestAnimationFrame(() => {
            refs.seekRaf.current = 0;
            flush();
        });
    }

    // Safari: when the decoder finishes a precise seek, immediately apply any
    // newer scrub target instead of waiting for the next animation frame.
    if (useFastSeek || refs.pendingTime.current === null || refs.seekedHooked.current) {
        return;
    }

    const video = getVideo();
    if (!video) {
        return;
    }

    refs.seekedHooked.current = true;
    const onSeeked = () => {
        refs.seekedHooked.current = false;
        if (refs.pendingTime.current !== null) {
            flush();
        }
    };

    if (video.seeking) {
        video.addEventListener('seeked', onSeeked, { once: true });
        return;
    }

    refs.seekedHooked.current = false;
    queueMicrotask(onSeeked);
}

/**
 * Coalesced scrub seek — one target per animation frame at most.
 * Never blocks on seeked (Safari included); issues new currentTime even while
 * a prior seek is still decoding so scrubbing keeps up with the slider.
 */
function flushCoalescedSeek(
    getVideo: () => HTMLVideoElement | null,
    refs: SeekChannelRefs,
    fps: number | null,
): void {
    const useFastSeek = shouldUseFastSeekForScrubbing();
    const video = getVideo();
    if (!video || refs.pendingTime.current === null) {
        return;
    }

    const target = resolveSeekTarget(video, refs.pendingTime.current, fps, useFastSeek);
    refs.pendingTime.current = null;

    if (!useFastSeek && refs.lastAppliedTime.current !== null) {
        const frameStep = fps && fps > 0 ? 1 / fps : 1 / 30;
        if (Math.abs(target - refs.lastAppliedTime.current) < frameStep * 0.25) {
            scheduleSeekFollowUp(getVideo, refs, fps, useFastSeek, () => {
                flushCoalescedSeek(getVideo, refs, fps);
            });
            return;
        }
    }

    refs.lastAppliedTime.current = target;
    performVideoSeek(video, target, useFastSeek);

    scheduleSeekFollowUp(getVideo, refs, fps, useFastSeek, () => {
        flushCoalescedSeek(getVideo, refs, fps);
    });
}

function scheduleVideoSeek(
    getVideo: () => HTMLVideoElement | null,
    refs: SeekChannelRefs,
    newTime: number,
    fps: number | null,
): void {
    refs.lastRequestedTime.current = newTime;
    refs.pendingTime.current = newTime;
    if (!refs.seekRaf.current) {
        refs.seekRaf.current = requestAnimationFrame(() => {
            refs.seekRaf.current = 0;
            flushCoalescedSeek(getVideo, refs, fps);
        });
    }
}

function commitVideoSeek(
    getVideo: () => HTMLVideoElement | null,
    refs: SeekChannelRefs,
    fps: number | null,
): void {
    cancelAnimationFrame(refs.seekRaf.current);
    refs.seekRaf.current = 0;
    refs.pendingTime.current = null;
    refs.seekedHooked.current = false;

    const video = getVideo();
    if (!video) {
        return;
    }

    const target = snapTimeToFrame(refs.lastRequestedTime.current, fps);
    refs.lastAppliedTime.current = target;
    performVideoSeek(video, target, false);
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
        lastRequestedTime: useRef(0),
        lastAppliedTime: useRef<number | null>(null),
    };
    const channel2: SeekChannelRefs = {
        pendingTime: useRef<number | null>(null),
        seekRaf: useRef(0),
        seekedHooked: useRef(false),
        lastRequestedTime: useRef(0),
        lastAppliedTime: useRef<number | null>(null),
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
        channel1.lastAppliedTime.current = null;
        channel2.pendingTime.current = null;
        channel2.seekedHooked.current = false;
        channel2.lastAppliedTime.current = null;
    }, [videoUrls]);

    const seekTo1 = useCallback((newTime: number) => {
        if (!getVideo1()) return;
        setCurrentTime1(newTime);
        scheduleVideoSeek(getVideo1, channel1, newTime, fps);
    }, [fps, getVideo1]);

    const seekTo2 = useCallback((newTime: number) => {
        if (!getVideo2()) return;
        setCurrentTime2(newTime);
        scheduleVideoSeek(getVideo2, channel2, newTime, fps);
    }, [fps, getVideo2]);

    const commitSeekTo1 = useCallback(() => {
        commitVideoSeek(getVideo1, channel1, fps);
    }, [fps, getVideo1]);

    const commitSeekTo2 = useCallback(() => {
        commitVideoSeek(getVideo2, channel2, fps);
    }, [fps, getVideo2]);

    useEffect(() => {
        if (direction === 'none') return;

        const video = videoRefs[0]?.current ?? null;
        const video2 = videoRefs[1]?.current ?? null;
        if (!video && !video2) return;

        const seekAmount = fps ? 1 / fps : 1 / 30;
        const delta = direction === 'right' ? seekAmount : -seekAmount;

        if (video && video.duration) {
            let newTime = video.currentTime + delta;
            newTime = Math.max(0, Math.min(newTime, video.duration));
            channel1.pendingTime.current = null;
            const snapped = snapTimeToFrame(newTime, fps);
            performVideoSeek(video, snapped, false);
            channel1.lastRequestedTime.current = newTime;
            channel1.lastAppliedTime.current = snapped;
            setCurrentTime1(newTime);
        }

        if (video2 && video2.duration) {
            let newTime = video2.currentTime + delta;
            newTime = Math.max(0, Math.min(newTime, video2.duration));
            channel2.pendingTime.current = null;
            const snapped = snapTimeToFrame(newTime, fps);
            performVideoSeek(video2, snapped, false);
            channel2.lastRequestedTime.current = newTime;
            channel2.lastAppliedTime.current = snapped;
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
        commitSeekTo1,
        commitSeekTo2,
    };
}
