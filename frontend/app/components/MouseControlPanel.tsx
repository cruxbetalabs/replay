'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MouseControlPanelProps {
    boxRef: React.RefObject<HTMLDivElement | null>;
    direction?: 'left' | 'right' | 'none';
    controlMode?: 'wheel' | 'drag' | 'both';
}

export function MouseControlPanel({
    boxRef,
    direction: externalDirection = 'none',
    controlMode = 'wheel',
}: MouseControlPanelProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawingRef = useRef(false);
    const pointsRef = useRef<{ x: number; y: number; timestamp: number }[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'none'>('none');

    useEffect(() => {
        const box = boxRef.current;
        const canvas = canvasRef.current;
        if (!box || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = box.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.floor(rect.width * ratio));
            canvas.height = Math.max(1, Math.floor(rect.height * ratio));
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(box);

        return () => observer.disconnect();
    }, [boxRef]);

    const drawLine = (x: number, y: number) => {
        pointsRef.current.push({ x, y, timestamp: Date.now() });
    };

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Filter points to only those from the last few moments
        const now = Date.now();
        const twoSecondsAgo = now - 250;
        pointsRef.current = pointsRef.current.filter(p => p.timestamp >= twoSecondsAgo);

        // Calculate swipe direction based on points
        if (pointsRef.current.length >= 2) {
            const firstPoint = pointsRef.current[0];
            const lastPoint = pointsRef.current[pointsRef.current.length - 1];
            const deltaX = lastPoint.x - firstPoint.x;

            if (Math.abs(deltaX) > 10) {
                setSwipeDirection(deltaX < 0 ? 'left' : 'right');
            }
        } else {
            setSwipeDirection('none');
        }

        // Draw all remaining points
        if (pointsRef.current.length > 0) {
            ctx.strokeStyle = 'rgba(46, 46, 46, 0.9)'; // draw line
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(pointsRef.current[0].x, pointsRef.current[0].y);
            for (let i = 1; i < pointsRef.current.length; i++) {
                ctx.lineTo(pointsRef.current[i].x, pointsRef.current[i].y);
            }
            ctx.stroke();
        }

        // Continue animation loop if we're drawing or have points to show
        if (isDrawingRef.current || pointsRef.current.length > 0) {
            animationFrameRef.current = requestAnimationFrame(redrawCanvas);
        } else {
            animationFrameRef.current = null;
        }
    };

    const startAnimationLoop = () => {
        if (animationFrameRef.current === null) {
            animationFrameRef.current = requestAnimationFrame(redrawCanvas);
        }
    };

    const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pointsRef.current = [];
        setSwipeDirection('none');
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const getBackgroundGradient = () => {
        // Use external direction from wheel/drag hook, or fallback to swipe direction
        const activeDirection = externalDirection !== 'none' ? externalDirection : swipeDirection;

        if (activeDirection === 'left') {
            return 'linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0))';
        } else if (activeDirection === 'right') {
            return 'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,0.5))';
        }
        return 'white';
    };

    // Use external direction from wheel/drag hook, or fallback to swipe direction
    const activeDirection = externalDirection !== 'none' ? externalDirection : swipeDirection;

    return (
        <div
            ref={boxRef}
            className="relative h-32 border-4 border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-move select-none hover:border-gray-500 transition-colors overflow-hidden"
            style={{
                background: getBackgroundGradient(),
            }}
        >
            {(controlMode === 'drag' || controlMode === 'both') && (
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0"
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        isDrawingRef.current = true;
                        pointsRef.current = [];
                        const point = getCanvasPoint(e);
                        drawLine(point.x, point.y);
                        startAnimationLoop();
                    }}
                    onPointerMove={(e) => {
                        if (!isDrawingRef.current) return;
                        const point = getCanvasPoint(e);
                        drawLine(point.x, point.y);
                    }}
                    onPointerUp={() => {
                        isDrawingRef.current = false;
                        pointsRef.current = [];
                        setSwipeDirection('none');
                    }}
                    onPointerLeave={() => {
                        isDrawingRef.current = false;
                        pointsRef.current = [];
                        setSwipeDirection('none');
                    }}
                />
            )}
            <p className={`text-md font-semibold ${activeDirection !== 'none' ? "text-white" : "text-gray-400"} dark:text-gray-300 text-center`}>
                {'Swipe Control Area'}
            </p>
        </div>
    );
}