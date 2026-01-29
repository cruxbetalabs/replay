'use client';

import { useEffect, useRef, useState } from 'react';

type ControlMode = 'wheel' | 'drag' | 'both';

interface UseMouseControlOptions {
    controlMode?: ControlMode;
}

export function useMouseControl({ controlMode = 'wheel' }: UseMouseControlOptions = {}) {
    const [direction, setDirection] = useState<'left' | 'right' | 'none'>('none');
    const [speed, setSpeed] = useState<number>(0);
    const [movement, setMovement] = useState<number>(0);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const box = boxRef.current;
        if (!box) return;

        let stopTimeout: ReturnType<typeof setTimeout> | null = null;
        let isDragging = false;
        let lastX: number | null = null;

        const scheduleStop = () => {
            if (stopTimeout) {
                clearTimeout(stopTimeout);
            }

            stopTimeout = setTimeout(() => {
                setDirection('none');
                setSpeed(0);
                stopTimeout = null;
            }, 200);
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const deltaX = e.deltaX;

            if (Math.abs(deltaX) > 1) {
                const newDirection = deltaX > 0 ? 'left' : 'right';
                setDirection(newDirection);
                setSpeed(1);
                setMovement((prev) => prev + 1);
                scheduleStop();
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            isDragging = true;
            lastX = e.clientX;
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || lastX === null) return;
            const currentX = e.clientX;
            const deltaX = currentX - lastX;

            if (Math.abs(deltaX) > 1) {
                const newDirection = deltaX > 0 ? 'right' : 'left';
                setDirection(newDirection);
                setSpeed(1);
                setMovement((prev) => prev + 1);
                lastX = currentX;
            }
        };

        const handleMouseUp = () => {
            isDragging = false;
            lastX = null;
            setDirection('none');
            setSpeed(0);
        };

        // Register wheel handlers for 'wheel' and 'both' modes
        if (controlMode === 'wheel' || controlMode === 'both') {
            box.addEventListener('wheel', handleWheel, { passive: false });
        }

        // Register drag handlers for 'drag' and 'both' modes
        if (controlMode === 'drag' || controlMode === 'both') {
            box.addEventListener('mousedown', handleMouseDown);
            box.addEventListener('mousemove', handleMouseMove);
            box.addEventListener('mouseup', handleMouseUp);
            box.addEventListener('mouseleave', handleMouseUp);
        }

        return () => {
            if (controlMode === 'wheel' || controlMode === 'both') {
                box.removeEventListener('wheel', handleWheel);
            }

            if (controlMode === 'drag' || controlMode === 'both') {
                box.removeEventListener('mousedown', handleMouseDown);
                box.removeEventListener('mousemove', handleMouseMove);
                box.removeEventListener('mouseup', handleMouseUp);
                box.removeEventListener('mouseleave', handleMouseUp);
            }

            if (stopTimeout) {
                clearTimeout(stopTimeout);
            }
        };
    }, [controlMode]);

    return {
        boxRef,
        direction,
        speed,
        movement,
        controlMode,
    };
}