'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFrameAtTime } from '../lib/key-moments';
import type { Annotation, AnnotationLabelGroup } from '../lib/annotations';

const ANNOTATION_STORAGE_PREFIX = 'replay:annotations:v1';

function getStorageKey(persistenceKey: string | null): string | null {
    if (!persistenceKey) return null;
    return `${ANNOTATION_STORAGE_PREFIX}:${persistenceKey}`;
}

function loadAnnotations(key: string): Annotation[] {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        return JSON.parse(raw) as Annotation[];
    } catch {
        return [];
    }
}

function saveAnnotations(key: string, annotations: Annotation[]): void {
    try {
        localStorage.setItem(key, JSON.stringify(annotations));
    } catch {
        // ignore quota errors
    }
}

interface UseAnnotationsOptions {
    persistenceKey: string | null;
    fps1: number | null;
    fps2: number | null;
}

export function useAnnotations({ persistenceKey, fps1, fps2 }: UseAnnotationsOptions) {
    const storageKey = getStorageKey(persistenceKey);

    const [annotations, setAnnotations] = useState<Annotation[]>(() => {
        if (!storageKey || typeof window === 'undefined') return [];
        return loadAnnotations(storageKey);
    });

    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

    // Reload when the video pair changes
    useEffect(() => {
        if (!storageKey) {
            setAnnotations([]);
            setSelectedAnnotationId(null);
            return;
        }
        setAnnotations(loadAnnotations(storageKey));
        setSelectedAnnotationId(null);
    }, [storageKey]);

    // Persist to localStorage on every change
    useEffect(() => {
        if (!storageKey) return;
        saveAnnotations(storageKey, annotations);
    }, [annotations, storageKey]);

    const createAnnotation = useCallback((videoIndex: 0 | 1, startTime: number): string => {
        const fps = videoIndex === 0 ? fps1 : fps2;
        const frame = getFrameAtTime(startTime, fps);
        const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const annotation: Annotation = {
            id,
            videoIndex,
            startTime,
            endTime: startTime,
            startFrame: frame,
            endFrame: frame,
            bodyPoseLabels: [],
            contactTechniqueLabels: [],
            movementLabels: [],
        };
        setAnnotations((prev) => [...prev, annotation]);
        setSelectedAnnotationId(id);
        return id;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fps1, fps2]);

    const deleteAnnotation = useCallback((id: string) => {
        setAnnotations((prev) => prev.filter((a) => a.id !== id));
        setSelectedAnnotationId((prev) => (prev === id ? null : prev));
    }, []);

    const updateAnnotationRange = useCallback((id: string, startTime: number, endTime: number) => {
        setAnnotations((prev) => prev.map((a) => {
            if (a.id !== id) return a;
            const fps = a.videoIndex === 0 ? fps1 : fps2;
            return {
                ...a,
                startTime,
                endTime,
                startFrame: getFrameAtTime(startTime, fps),
                endFrame: getFrameAtTime(endTime, fps),
            };
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fps1, fps2]);

    const toggleAnnotationLabel = useCallback((id: string, group: AnnotationLabelGroup, label: string) => {
        setAnnotations((prev) => prev.map((a) => {
            if (a.id !== id) return a;
            const key = group === 'bodyPose' ? 'bodyPoseLabels'
                : group === 'contactTechnique' ? 'contactTechniqueLabels'
                    : 'movementLabels';
            const current = a[key];
            return {
                ...a,
                [key]: current.includes(label)
                    ? current.filter((l) => l !== label)
                    : [...current, label],
            };
        }));
    }, []);

    const setAnnotationNotes = useCallback((id: string, notes: string) => {
        setAnnotations((prev) => prev.map((a) => a.id === id ? { ...a, notes } : a));
    }, []);

    return {
        annotations,
        selectedAnnotationId,
        setSelectedAnnotationId,
        createAnnotation,
        deleteAnnotation,
        updateAnnotationRange,
        toggleAnnotationLabel,
        setAnnotationNotes,
    };
}
