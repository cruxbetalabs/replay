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

    // Cancel any outstanding rAF seek requests on unmount.
    useEffect(() => () => {
        cancelAnimationFrame(seekRaf1Ref.current);
        cancelAnimationFrame(seekRaf2Ref.current);
    }, []);

    const seekTo1 = useCallback((newTime: number) => {
        const video = videoRefs[0]?.current ?? null;
        if (!video) return;
        // Update React state immediately so the slider stays at the dragged position.
        setCurrentTime1(newTime);
        // Coalesce the actual video seek — only the most recent value matters.
        pendingTime1Ref.current = newTime;
        if (!seekRaf1Ref.current) {
            seekRaf1Ref.current = requestAnimationFrame(() => {
                seekRaf1Ref.current = 0;
                if (pendingTime1Ref.current !== null) {
                    video.currentTime = pendingTime1Ref.current;
                    pendingTime1Ref.current = null;
                }
            });
        }
    }, [videoRefs]);

    const seekTo2 = useCallback((newTime: number) => {
        const video2 = videoRefs[1]?.current ?? null;
        if (!video2) return;
        setCurrentTime2(newTime);
        pendingTime2Ref.current = newTime;
        if (!seekRaf2Ref.current) {
            seekRaf2Ref.current = requestAnimationFrame(() => {
                seekRaf2Ref.current = 0;
                if (pendingTime2Ref.current !== null) {
                    video2.currentTime = pendingTime2Ref.current;
                    pendingTime2Ref.current = null;
                }
            });
        }
    }, [videoRefs]);

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
            video.currentTime = newTime;
        }

        if (video2 && video2.duration) {
            let newTime = video2.currentTime + delta;
            newTime = Math.max(0, Math.min(newTime, video2.duration));
            video2.currentTime = newTime;
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