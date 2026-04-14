'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { buildKeyMomentPosition, type KeyMoment, type VideoIndex } from '../lib/key-moments';
import type { KeyboardShortcut } from './useKeyboardShortcuts';

interface PersistedKeyMomentState {
    version: 1;
    keyMoments: KeyMoment[];
    selectedKeyMomentId: string | null;
}

interface UseKeyMomentsOptions {
    currentTimeByIndex: [number, number];
    durationByIndex: [number, number];
    fpsByIndex: [number | null, number | null];
    hasVideoByIndex: [boolean, boolean];
    videoRefs: [RefObject<HTMLVideoElement | null>, RefObject<HTMLVideoElement | null>];
    seekToByIndex: [(time: number) => void, (time: number) => void];
    persistenceKey?: string | null;
}

const isKeyMomentPosition = (value: unknown): value is NonNullable<KeyMoment['positions'][number]> => {
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

const parsePersistedKeyMomentState = (rawValue: string): PersistedKeyMomentState | null => {
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
            version: 1,
            keyMoments: parsedValue.keyMoments,
            selectedKeyMomentId: parsedValue.selectedKeyMomentId,
        };
    } catch {
        return null;
    }
};

export function useKeyMoments({
    currentTimeByIndex,
    durationByIndex,
    fpsByIndex,
    hasVideoByIndex,
    videoRefs,
    seekToByIndex,
    persistenceKey = null,
}: UseKeyMomentsOptions) {
    const [activePlaybackSliderIndex, setActivePlaybackSliderIndex] = useState<VideoIndex | null>(null);
    const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([]);
    const [selectedKeyMomentId, setSelectedKeyMomentId] = useState<string | null>(null);

    const pauseVideos = useCallback(() => {
        videoRefs[0].current?.pause();
        videoRefs[1].current?.pause();
    }, [videoRefs]);

    const createKeyMomentFromVideo = useCallback((sourceIndex: VideoIndex) => {
        const sourceTime = currentTimeByIndex[sourceIndex];
        const nextKeyMomentId = crypto.randomUUID();

        setSelectedKeyMomentId(nextKeyMomentId);
        setKeyMoments((prev) => [
            ...prev,
            {
                id: nextKeyMomentId,
                positions: [
                    hasVideoByIndex[0] ? buildKeyMomentPosition(sourceTime, fpsByIndex[0]) : null,
                    hasVideoByIndex[1] ? buildKeyMomentPosition(sourceTime, fpsByIndex[1]) : null,
                ],
            },
        ]);
    }, [currentTimeByIndex, fpsByIndex, hasVideoByIndex]);

    const updateKeyMomentFromVideo = useCallback((keyMomentId: string, sourceIndex: VideoIndex) => {
        const sourceTime = currentTimeByIndex[sourceIndex];
        const sourceFps = fpsByIndex[sourceIndex];

        setKeyMoments((prev) => prev.map((keyMoment) => {
            if (keyMoment.id !== keyMomentId) {
                return keyMoment;
            }

            const nextPositions: KeyMoment['positions'] = [...keyMoment.positions];
            nextPositions[sourceIndex] = buildKeyMomentPosition(sourceTime, sourceFps);

            return {
                ...keyMoment,
                positions: nextPositions,
            };
        }));
    }, [currentTimeByIndex, fpsByIndex]);

    const jumpToKeyMoment = useCallback((keyMomentId: string) => {
        const keyMoment = keyMoments.find((entry) => entry.id === keyMomentId);
        if (!keyMoment) {
            return;
        }

        setSelectedKeyMomentId(keyMomentId);
        pauseVideos();

        const position1 = keyMoment.positions[0];
        const position2 = keyMoment.positions[1];

        if (position1 && hasVideoByIndex[0]) {
            seekToByIndex[0](position1.time);
        }

        if (position2 && hasVideoByIndex[1]) {
            seekToByIndex[1](position2.time);
        }
    }, [hasVideoByIndex, keyMoments, pauseVideos, seekToByIndex]);

    const deleteKeyMoment = useCallback((keyMomentId: string) => {
        setKeyMoments((prev) => prev.filter((keyMoment) => keyMoment.id !== keyMomentId));
        setSelectedKeyMomentId((prev) => (prev === keyMomentId ? null : prev));
    }, []);

    const setKeyMomentTime = useCallback((keyMomentId: string, videoIndex: VideoIndex, nextTime: number) => {
        const videoDuration = durationByIndex[videoIndex];
        const boundedTime = Math.max(0, Math.min(nextTime, videoDuration || nextTime));
        const sourceFps = fpsByIndex[videoIndex];

        setSelectedKeyMomentId(keyMomentId);
        setKeyMoments((prev) => prev.map((keyMoment) => {
            if (keyMoment.id !== keyMomentId) {
                return keyMoment;
            }

            const nextPositions: KeyMoment['positions'] = [...keyMoment.positions];
            nextPositions[videoIndex] = buildKeyMomentPosition(boundedTime, sourceFps);

            return {
                ...keyMoment,
                positions: nextPositions,
            };
        }));

        pauseVideos();
        if (hasVideoByIndex[videoIndex]) {
            seekToByIndex[videoIndex](boundedTime);
        }
    }, [durationByIndex, fpsByIndex, hasVideoByIndex, pauseVideos, seekToByIndex]);

    const clearVideoKeyMoments = useCallback((videoIndex: VideoIndex) => {
        setKeyMoments((prev) => {
            const nextKeyMoments = prev
                .map((keyMoment) => {
                    const nextPositions: KeyMoment['positions'] = [...keyMoment.positions];
                    nextPositions[videoIndex] = null;

                    return {
                        ...keyMoment,
                        positions: nextPositions,
                    };
                })
                .filter((keyMoment) => keyMoment.positions.some(Boolean));

            setSelectedKeyMomentId((currentSelectedId) => {
                if (!currentSelectedId) {
                    return currentSelectedId;
                }

                return nextKeyMoments.some((keyMoment) => keyMoment.id === currentSelectedId) ? currentSelectedId : null;
            });

            return nextKeyMoments;
        });
    }, []);

    useEffect(() => {
        if (!persistenceKey || typeof window === 'undefined') {
            return;
        }

        const persistedState = parsePersistedKeyMomentState(window.localStorage.getItem(persistenceKey) ?? '');
        if (!persistedState) {
            setKeyMoments([]);
            setSelectedKeyMomentId(null);
            return;
        }

        setKeyMoments(persistedState.keyMoments);
        setSelectedKeyMomentId(persistedState.selectedKeyMomentId);
    }, [persistenceKey]);

    useEffect(() => {
        if (!persistenceKey || typeof window === 'undefined') {
            return;
        }

        const nextPersistedState: PersistedKeyMomentState = {
            version: 1,
            keyMoments,
            selectedKeyMomentId,
        };

        window.localStorage.setItem(persistenceKey, JSON.stringify(nextPersistedState));
    }, [keyMoments, persistenceKey, selectedKeyMomentId]);

    useEffect(() => {
        if (activePlaybackSliderIndex === 0 && !hasVideoByIndex[0]) {
            setActivePlaybackSliderIndex(hasVideoByIndex[1] ? 1 : null);
            return;
        }

        if (activePlaybackSliderIndex === 1 && !hasVideoByIndex[1]) {
            setActivePlaybackSliderIndex(hasVideoByIndex[0] ? 0 : null);
            return;
        }

        if (activePlaybackSliderIndex == null) {
            if (hasVideoByIndex[0]) {
                setActivePlaybackSliderIndex(0);
                return;
            }

            if (hasVideoByIndex[1]) {
                setActivePlaybackSliderIndex(1);
            }
        }
    }, [activePlaybackSliderIndex, hasVideoByIndex]);

    const keyMomentShortcuts = useMemo<KeyboardShortcut[]>(() => keyMoments.slice(0, 9).map((keyMoment, index) => ({
        key: String(index + 1),
        onTrigger: () => jumpToKeyMoment(keyMoment.id),
    })), [jumpToKeyMoment, keyMoments]);

    const addKeyShortcut = useMemo<KeyboardShortcut>(() => ({
        key: 'n',
        enabled: Boolean(hasVideoByIndex[0] || hasVideoByIndex[1]),
        onTrigger: () => {
            if (activePlaybackSliderIndex === 0 && hasVideoByIndex[0]) {
                createKeyMomentFromVideo(0);
                return;
            }

            if (activePlaybackSliderIndex === 1 && hasVideoByIndex[1]) {
                createKeyMomentFromVideo(1);
                return;
            }

            if (hasVideoByIndex[0]) {
                createKeyMomentFromVideo(0);
                return;
            }

            if (hasVideoByIndex[1]) {
                createKeyMomentFromVideo(1);
            }
        },
    }), [activePlaybackSliderIndex, createKeyMomentFromVideo, hasVideoByIndex]);

    return {
        activePlaybackSliderIndex,
        keyMoments,
        selectedKeyMomentId,
        setActivePlaybackSliderIndex,
        createKeyMomentFromVideo,
        updateKeyMomentFromVideo,
        jumpToKeyMoment,
        deleteKeyMoment,
        setKeyMomentTime,
        clearVideoKeyMoments,
        keyMomentShortcuts,
        addKeyShortcut,
    };
}