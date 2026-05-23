'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface UseVideoControlOptions {
    videoRefs: RefObject<HTMLVideoElement | null>[];
    videoUrls?: (string | null)[];
    direction?: 'left' | 'right' | 'none';
    movement?: number;
    fps?: number | null;
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

    // Pending seek times and rAF IDs used to coalesce rapid slider drags.
    // video.currentTime is assigned at most once per animation frame so the
    // browser decoder queue never grows unboundedly during fast scrubbing.
    const pendingTime1Ref = useRef<number | null>(null);
    const pendingTime2Ref = useRef<number | null>(null);
    const seekRaf1Ref = useRef<number>(0);
    const seekRaf2Ref = useRef<number>(0);
    const videoRefsRef = useRef(videoRefs);

    useLayoutEffect(() => {
        videoRefsRef.current = videoRefs;
    }, [videoRefs]);

    // Cancel any outstanding rAF seek requests on unmount.
    useEffect(() => () => {
        cancelAnimationFrame(seekRaf1Ref.current);
        cancelAnimationFrame(seekRaf2Ref.current);
    }, []);

    const scheduleSeek = useCallback((videoIndex: 0 | 1, newTime: number) => {
        const video = videoRefsRef.current[videoIndex]?.current ?? null;
        if (!video) return;

        if (videoIndex === 0) {
            setCurrentTime1(newTime);
        } else {
            setCurrentTime2(newTime);
        }

        const pendingRef = videoIndex === 0 ? pendingTime1Ref : pendingTime2Ref;
        const seekRafRef = videoIndex === 0 ? seekRaf1Ref : seekRaf2Ref;

        pendingRef.current = newTime;
        if (!seekRafRef.current) {
            seekRafRef.current = requestAnimationFrame(() => {
                seekRafRef.current = 0;
                const el = videoRefsRef.current[videoIndex]?.current;
                if (el && pendingRef.current !== null) {
                    el.currentTime = pendingRef.current;
                    pendingRef.current = null;
                }
            });
        }
    }, []);

    const seekTo1 = useCallback((newTime: number) => {
        scheduleSeek(0, newTime);
    }, [scheduleSeek]);

    const seekTo2 = useCallback((newTime: number) => {
        scheduleSeek(1, newTime);
    }, [scheduleSeek]);

    useEffect(() => {
        if (direction === 'none') return;

        const videoEl = videoRefsRef.current[0]?.current ?? null;
        const videoEl2 = videoRefsRef.current[1]?.current ?? null;
        if (!videoEl && !videoEl2) return;

        const seekAmount = fps ? 1 / fps : 1 / 30;
        const delta = direction === 'right' ? seekAmount : -seekAmount;

        queueMicrotask(() => {
            if (videoEl && videoEl.duration) {
                let newTime = videoEl.currentTime + delta;
                newTime = Math.max(0, Math.min(newTime, videoEl.duration));
                scheduleSeek(0, newTime);
            }

            if (videoEl2 && videoEl2.duration) {
                let newTime = videoEl2.currentTime + delta;
                newTime = Math.max(0, Math.min(newTime, videoEl2.duration));
                scheduleSeek(1, newTime);
            }
        });
    }, [direction, movement, fps, scheduleSeek]);

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
        }

        if (video2) {
            video2.addEventListener('timeupdate', updateTime2);
            video2.addEventListener('loadedmetadata', updateDuration2);
        }

        return () => {
            if (video) {
                video.removeEventListener('timeupdate', updateTime1);
                video.removeEventListener('loadedmetadata', updateDuration1);
            }
            if (video2) {
                video2.removeEventListener('timeupdate', updateTime2);
                video2.removeEventListener('loadedmetadata', updateDuration2);
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