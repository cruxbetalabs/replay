'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    readVideoAnnotationState,
    writeVideoAnnotationState,
    type AnnotationTiming,
    type VideoAnnotationEditorState,
} from '../lib/video-annotations';
import type { VideoIndex } from '../lib/key-moments';

interface UseVideoAnnotationsOptions {
    persistenceKey?: string | null;
}

export function useVideoAnnotations({ persistenceKey = null }: UseVideoAnnotationsOptions) {
    const [editorState, setEditorState] = useState<VideoAnnotationEditorState>(
        () => readVideoAnnotationState(persistenceKey),
    );
    const [prevPersistenceKey, setPrevPersistenceKey] = useState(persistenceKey);

    if (persistenceKey !== prevPersistenceKey) {
        setPrevPersistenceKey(persistenceKey);
        setEditorState(readVideoAnnotationState(persistenceKey));
    }

    useEffect(() => {
        writeVideoAnnotationState(persistenceKey, editorState);
    }, [editorState, persistenceKey]);

    const toggleEnabled = useCallback((videoIndex: VideoIndex) => {
        setEditorState((prev) => {
            const nextEnabledByIndex: [boolean, boolean] = [...prev.enabledByIndex] as [boolean, boolean];
            nextEnabledByIndex[videoIndex] = !nextEnabledByIndex[videoIndex];
            return { ...prev, enabledByIndex: nextEnabledByIndex };
        });
    }, []);

    const setShapeTimings = useCallback((videoIndex: VideoIndex, shapeTimings: Record<string, AnnotationTiming>) => {
        setEditorState((prev) => {
            const nextShapeTimingsByIndex: [
                Record<string, AnnotationTiming>,
                Record<string, AnnotationTiming>,
            ] = [
                { ...prev.shapeTimingsByIndex[0] },
                { ...prev.shapeTimingsByIndex[1] },
            ];
            nextShapeTimingsByIndex[videoIndex] = shapeTimings;
            return { ...prev, shapeTimingsByIndex: nextShapeTimingsByIndex };
        });
    }, []);

    const upsertShapeTiming = useCallback((
        videoIndex: VideoIndex,
        shapeId: string,
        timing: AnnotationTiming,
    ) => {
        setEditorState((prev) => {
            const nextShapeTimingsByIndex: [
                Record<string, AnnotationTiming>,
                Record<string, AnnotationTiming>,
            ] = [
                { ...prev.shapeTimingsByIndex[0] },
                { ...prev.shapeTimingsByIndex[1] },
            ];
            nextShapeTimingsByIndex[videoIndex] = {
                ...nextShapeTimingsByIndex[videoIndex],
                [shapeId]: timing,
            };
            return { ...prev, shapeTimingsByIndex: nextShapeTimingsByIndex };
        });
    }, []);

    const updateShapeTiming = useCallback((
        videoIndex: VideoIndex,
        shapeId: string,
        timing: AnnotationTiming,
    ) => {
        upsertShapeTiming(videoIndex, shapeId, timing);
    }, [upsertShapeTiming]);

    const removeShapeTiming = useCallback((videoIndex: VideoIndex, shapeId: string) => {
        setEditorState((prev) => {
            const nextTimings = { ...prev.shapeTimingsByIndex[videoIndex] };
            delete nextTimings[shapeId];
            const nextShapeTimingsByIndex: [
                Record<string, AnnotationTiming>,
                Record<string, AnnotationTiming>,
            ] = [
                { ...prev.shapeTimingsByIndex[0] },
                { ...prev.shapeTimingsByIndex[1] },
            ];
            nextShapeTimingsByIndex[videoIndex] = nextTimings;
            return { ...prev, shapeTimingsByIndex: nextShapeTimingsByIndex };
        });
    }, []);

    return {
        enabledByIndex: editorState.enabledByIndex,
        shapeTimingsByIndex: editorState.shapeTimingsByIndex,
        toggleEnabled,
        setShapeTimings,
        upsertShapeTiming,
        updateShapeTiming,
        removeShapeTiming,
    };
}
