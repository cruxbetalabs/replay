'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import { formatVideoTime } from '../../lib/key-moments';
import styles from '../VideoPlaybackSection.module.css';
import annotationStyles from './AnnotationPlaybackSlider.module.css';

interface AnnotationPlaybackSliderProps {
    mode: 'scrub' | 'range';
    videoIndex: 0 | 1;
    currentTime: number;
    duration: number;
    seekAmount: number;
    rangeStart?: number;
    rangeEnd?: number;
    onSeek: (time: number) => void;
    onRangeChange?: (startTime: number, endTime: number) => void;
}

const getPercent = (time: number, duration: number) => {
    if (!duration || duration <= 0) {
        return 0;
    }

    return Math.max(0, Math.min((time / duration) * 100, 100));
};

type RangeHandle = 'start' | 'end';

export function AnnotationPlaybackSlider({
    mode,
    videoIndex,
    currentTime,
    duration,
    seekAmount,
    rangeStart = 0,
    rangeEnd = 0,
    onSeek,
    onRangeChange,
}: AnnotationPlaybackSliderProps) {
    const playbackTrackClassName = [
        styles.playbackSliderTrack,
        videoIndex === 0 ? styles.playbackSliderVideo1 : styles.playbackSliderVideo2,
    ].filter(Boolean).join(' ');
    const playbackSliderClassName = [
        styles.playbackSlider,
        videoIndex === 0 ? styles.playbackSliderVideo1 : styles.playbackSliderVideo2,
    ].filter(Boolean).join(' ');

    const playbackProgressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const rangeStartPercent = getPercent(rangeStart, duration);
    const rangeEndPercent = getPercent(rangeEnd, duration);

    const handleRangePointerDown = (handle: RangeHandle) => (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (!onRangeChange || duration <= 0) {
            return;
        }

        const track = event.currentTarget.parentElement;
        if (!track) {
            return;
        }

        const updateFromClientX = (clientX: number) => {
            const rect = track.getBoundingClientRect();
            const ratio = (clientX - rect.left) / rect.width;
            const boundedRatio = Math.max(0, Math.min(ratio, 1));
            const nextTime = boundedRatio * duration;

            if (handle === 'start') {
                onRangeChange(nextTime, rangeEnd);
                return;
            }

            onRangeChange(rangeStart, nextTime);
        };

        const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
            updateFromClientX(moveEvent.clientX);
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    if (mode === 'scrub') {
        return (
            <div className="pointer-events-auto px-4 pb-4">
                <div className={playbackTrackClassName}>
                    <div
                        className={styles.playbackSliderFill}
                        style={{ width: `${playbackProgressPercent}%` }}
                        aria-hidden
                    />
                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={seekAmount}
                        value={currentTime}
                        aria-label="Annotation frame position"
                        onChange={(event) => onSeek(parseFloat(event.target.value))}
                        className={playbackSliderClassName}
                    />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
                    <span>Annotation frame</span>
                    <span className="font-mono text-white/85">
                        {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="pointer-events-auto px-4 pb-4">
            <div className={`${playbackTrackClassName} ${annotationStyles.rangeTrack}`}>
                <div
                    className={annotationStyles.rangeFill}
                    style={{
                        left: `${rangeStartPercent}%`,
                        width: `${Math.max(rangeEndPercent - rangeStartPercent, 0)}%`,
                    }}
                    aria-hidden
                />
                <button
                    type="button"
                    className={annotationStyles.rangeHandle}
                    style={{ left: `${rangeStartPercent}%` }}
                    aria-label="Adjust annotation start time"
                    onPointerDown={handleRangePointerDown('start')}
                />
                <button
                    type="button"
                    className={annotationStyles.rangeHandle}
                    style={{ left: `${rangeEndPercent}%` }}
                    aria-label="Adjust annotation end time"
                    onPointerDown={handleRangePointerDown('end')}
                />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
                <span>Annotation duration</span>
                <span className="font-mono text-white/85">
                    {formatVideoTime(rangeStart)} – {formatVideoTime(rangeEnd)}
                </span>
            </div>
        </div>
    );
}
