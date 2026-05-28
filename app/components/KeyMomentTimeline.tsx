'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyMoment, KeyMomentPosition, VideoIndex } from '../lib/key-moments';

interface KeyMomentTimelineProps {
    duration: number;
    keyMoments: KeyMoment[];
    videoIndex: VideoIndex;
    selectedKeyMomentId: string | null;
    accentClassName: string;
    onSelectKeyMoment: (keyMomentId: string) => void;
    onDeselectKeyMoment: () => void;
    onChangeKeyMomentTime: (keyMomentId: string, time: number) => void;
}

const getPercent = (time: number, duration: number) => {
    if (!duration || duration <= 0) {
        return 0;
    }

    return Math.max(0, Math.min((time / duration) * 100, 100));
};

type VisibleKeyMoment = {
    id: string;
    index: number;
    position: KeyMomentPosition;
};

export function KeyMomentTimeline({
    duration,
    keyMoments,
    videoIndex,
    selectedKeyMomentId,
    accentClassName,
    onSelectKeyMoment,
    onDeselectKeyMoment,
    onChangeKeyMomentTime,
}: KeyMomentTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [draggingKeyMomentId, setDraggingKeyMomentId] = useState<string | null>(null);
    const wasPreviouslySelectedRef = useRef(false);
    const hasDraggedRef = useRef(false);

    const visibleMoments = keyMoments
        .map((keyMoment, index) => ({
            id: keyMoment.id,
            index,
            position: keyMoment.positions[videoIndex],
        }))
        .filter((entry): entry is VisibleKeyMoment => entry.position !== null);

    useEffect(() => {
        if (!draggingKeyMomentId) {
            return;
        }

        const updateTimeFromClientX = (clientX: number) => {
            const track = trackRef.current;
            if (!track || duration <= 0) {
                return;
            }

            const rect = track.getBoundingClientRect();
            const ratio = (clientX - rect.left) / rect.width;
            const boundedRatio = Math.max(0, Math.min(ratio, 1));
            onChangeKeyMomentTime(draggingKeyMomentId, boundedRatio * duration);
        };

        const handlePointerMove = (event: PointerEvent) => {
            hasDraggedRef.current = true;
            updateTimeFromClientX(event.clientX);
        };

        const handlePointerUp = () => {
            if (wasPreviouslySelectedRef.current && !hasDraggedRef.current) {
                onDeselectKeyMoment();
            }
            setDraggingKeyMomentId(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggingKeyMomentId, duration, onChangeKeyMomentTime, onDeselectKeyMoment]);

    return (
        <div className="space-y-1">
            <div
                ref={trackRef}
                className="relative h-3 rounded-full bg-gray-200 dark:bg-gray-700"
            >
                {visibleMoments.map((entry) => {
                    const percent = getPercent(entry.position.time, duration);
                    const isSelected = entry.id === selectedKeyMomentId;

                    return (
                        <button
                            key={entry.id}
                            type="button"
                            onPointerDown={(event) => {
                                event.preventDefault();
                                wasPreviouslySelectedRef.current = isSelected;
                                hasDraggedRef.current = false;
                                onSelectKeyMoment(entry.id);
                                setDraggingKeyMomentId(entry.id);
                            }}
                            className={`pointer-events-auto absolute top-1/2 flex rounded-sm size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center border-2 shadow transition-transform hover:scale-110 focus:outline-none ${accentClassName} ${isSelected ? 'scale-110' : ''}`.trim()}
                            style={{
                                left: `${percent}%`,
                                ...(isSelected ? { background: 'currentColor' } : {}),
                            }}
                            aria-label={`Select key ${entry.index + 1}`}
                            title={`Key ${entry.index + 1}`}
                        >
                            <span className={`block size-1.5 -rotate-45 rounded-full ${isSelected ? 'bg-white/20' : 'bg-current'}`} />
                            <span className="sr-only">Key {entry.index + 1}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}