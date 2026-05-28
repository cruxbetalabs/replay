'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
    buildKeyMomentPosition,
    readKeyMomentEditorState,
    resolveActivePlaybackSliderIndex,
    writeKeyMomentEditorState,
    type KeyMoment,
    type KeyMomentEditorState,
    type VideoIndex,
} from '../lib/key-moments';
import type { KeyboardShortcut } from './useKeyboardShortcuts';

interface UseKeyMomentsOptions {
    currentTimeByIndex: [number, number];
    durationByIndex: [number, number];
    fpsByIndex: [number | null, number | null];
    hasVideoByIndex: [boolean, boolean];
    videoRefs: [RefObject<HTMLVideoElement | null>, RefObject<HTMLVideoElement | null>];
    seekToByIndex: [(time: number) => void, (time: number) => void];
    persistenceKey?: string | null;
    presetKeyMomentsStamp?: string | null;
    presetKeyMomentsState?: KeyMomentEditorState | null;
}

export function useKeyMoments({
    currentTimeByIndex,
    durationByIndex,
    fpsByIndex,
    hasVideoByIndex,
    videoRefs,
    seekToByIndex,
    persistenceKey = null,
    presetKeyMomentsStamp = null,
    presetKeyMomentsState = null,
}: UseKeyMomentsOptions) {
    const [editorState, setEditorState] = useState<KeyMomentEditorState>(() => readKeyMomentEditorState(persistenceKey));
    const [prevPersistenceKey, setPrevPersistenceKey] = useState(persistenceKey);
    const [playbackSliderChoice, setPlaybackSliderChoice] = useState<VideoIndex | null>(null);
    const appliedPresetStampRef = useRef<string | null>(null);

    if (persistenceKey !== prevPersistenceKey) {
        setPrevPersistenceKey(persistenceKey);
        setEditorState(readKeyMomentEditorState(persistenceKey));
        appliedPresetStampRef.current = null;
    }

    if (
        presetKeyMomentsStamp
        && presetKeyMomentsStamp !== appliedPresetStampRef.current
        && presetKeyMomentsState
    ) {
        appliedPresetStampRef.current = presetKeyMomentsStamp;
        setEditorState(presetKeyMomentsState);
    }

    const { keyMoments, selectedKeyMomentId } = editorState;

    useEffect(() => {
        writeKeyMomentEditorState(persistenceKey, editorState);
    }, [editorState, persistenceKey]);

    const updateEditorState = useCallback((updater: (prev: KeyMomentEditorState) => KeyMomentEditorState) => {
        setEditorState((prev) => updater(prev));
    }, []);

    const activePlaybackSliderIndex = useMemo(
        () => resolveActivePlaybackSliderIndex(playbackSliderChoice, hasVideoByIndex),
        [hasVideoByIndex, playbackSliderChoice],
    );

    const pauseVideos = useCallback(() => {
        videoRefs[0].current?.pause();
        videoRefs[1].current?.pause();
    }, [videoRefs]);

    const createKeyMomentFromVideo = useCallback((sourceIndex: VideoIndex) => {
        const sourceTime = currentTimeByIndex[sourceIndex];
        const nextKeyMomentId = crypto.randomUUID();

        updateEditorState((prev) => ({
            selectedKeyMomentId: nextKeyMomentId,
            keyMoments: [
                ...prev.keyMoments,
                {
                    id: nextKeyMomentId,
                    positions: [
                        hasVideoByIndex[0] ? buildKeyMomentPosition(sourceTime, fpsByIndex[0]) : null,
                        hasVideoByIndex[1] ? buildKeyMomentPosition(sourceTime, fpsByIndex[1]) : null,
                    ],
                },
            ],
        }));
    }, [currentTimeByIndex, fpsByIndex, hasVideoByIndex, updateEditorState]);

    const updateKeyMomentFromVideo = useCallback((keyMomentId: string, sourceIndex: VideoIndex) => {
        const sourceTime = currentTimeByIndex[sourceIndex];
        const sourceFps = fpsByIndex[sourceIndex];

        updateEditorState((prev) => ({
            ...prev,
            keyMoments: prev.keyMoments.map((keyMoment) => {
                if (keyMoment.id !== keyMomentId) {
                    return keyMoment;
                }

                const nextPositions: KeyMoment['positions'] = [...keyMoment.positions];
                nextPositions[sourceIndex] = buildKeyMomentPosition(sourceTime, sourceFps);

                return {
                    ...keyMoment,
                    positions: nextPositions,
                };
            }),
        }));
    }, [currentTimeByIndex, fpsByIndex, updateEditorState]);

    const jumpToKeyMoment = useCallback((keyMomentId: string) => {
        const keyMoment = keyMoments.find((entry) => entry.id === keyMomentId);
        if (!keyMoment) {
            return;
        }

        updateEditorState((prev) => ({
            ...prev,
            selectedKeyMomentId: keyMomentId,
        }));
        pauseVideos();

        const position1 = keyMoment.positions[0];
        const position2 = keyMoment.positions[1];

        if (position1 && hasVideoByIndex[0]) {
            seekToByIndex[0](position1.time);
        }

        if (position2 && hasVideoByIndex[1]) {
            seekToByIndex[1](position2.time);
        }
    }, [hasVideoByIndex, keyMoments, pauseVideos, seekToByIndex, updateEditorState]);

    const deleteKeyMoment = useCallback((keyMomentId: string) => {
        updateEditorState((prev) => ({
            keyMoments: prev.keyMoments.filter((keyMoment) => keyMoment.id !== keyMomentId),
            selectedKeyMomentId: prev.selectedKeyMomentId === keyMomentId ? null : prev.selectedKeyMomentId,
        }));
    }, [updateEditorState]);

    const setKeyMomentTime = useCallback((keyMomentId: string, videoIndex: VideoIndex, nextTime: number) => {
        const videoDuration = durationByIndex[videoIndex];
        const boundedTime = Math.max(0, Math.min(nextTime, videoDuration || nextTime));
        const sourceFps = fpsByIndex[videoIndex];

        updateEditorState((prev) => ({
            selectedKeyMomentId: keyMomentId,
            keyMoments: prev.keyMoments.map((keyMoment) => {
                if (keyMoment.id !== keyMomentId) {
                    return keyMoment;
                }

                const nextPositions: KeyMoment['positions'] = [...keyMoment.positions];
                nextPositions[videoIndex] = buildKeyMomentPosition(boundedTime, sourceFps);

                return {
                    ...keyMoment,
                    positions: nextPositions,
                };
            }),
        }));

        pauseVideos();
        if (hasVideoByIndex[videoIndex]) {
            seekToByIndex[videoIndex](boundedTime);
        }
    }, [durationByIndex, fpsByIndex, hasVideoByIndex, pauseVideos, seekToByIndex, updateEditorState]);

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

    const deselectKeyMoment = useCallback(() => {
        updateEditorState((prev) => ({
            ...prev,
            selectedKeyMomentId: null,
        }));
    }, [updateEditorState]);

    const resetKeyMoments = useCallback((nextKeyMoments: KeyMoment[], nextSelectedId: string | null) => {
        setEditorState({
            keyMoments: nextKeyMoments,
            selectedKeyMomentId: nextSelectedId,
        });
    }, []);

    return {
        activePlaybackSliderIndex,
        keyMoments,
        selectedKeyMomentId,
        setActivePlaybackSliderIndex: setPlaybackSliderChoice,
        createKeyMomentFromVideo,
        updateKeyMomentFromVideo,
        jumpToKeyMoment,
        deleteKeyMoment,
        deselectKeyMoment,
        setKeyMomentTime,
        keyMomentShortcuts,
        addKeyShortcut,
        resetKeyMoments,
    };
}
