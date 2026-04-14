'use client';

import { KeyMomentTimeline } from './KeyMomentTimeline';
import { formatVideoTime, type KeyMoment, type KeyMomentPosition, type VideoIndex } from '../lib/key-moments';

interface VideoPlaybackSectionProps {
    label: string;
    videoIndex: VideoIndex;
    currentTime: number;
    duration: number;
    fps: number | null;
    seekAmount: number;
    keyMoments: KeyMoment[];
    selectedKeyMomentId: string | null;
    selectedPosition: KeyMomentPosition | null;
    accentClassName: string;
    timelineAccentClassName: string;
    addButtonClassName: string;
    updateButtonClassName: string;
    sliderClassName: string;
    metaClassName: string;
    onSeek: (time: number) => void;
    onActivateSlider: (videoIndex: VideoIndex) => void;
    onSelectKeyMoment: (keyMomentId: string) => void;
    onChangeKeyMomentTime: (keyMomentId: string, time: number) => void;
    onAddKeyMoment: () => void;
    onUpdateSelectedKeyMoment: (keyMomentId: string) => void;
    onDeleteSelectedKeyMoment: (keyMomentId: string) => void;
}

export function VideoPlaybackSection({
    label,
    videoIndex,
    currentTime,
    duration,
    fps,
    seekAmount,
    keyMoments,
    selectedKeyMomentId,
    selectedPosition,
    accentClassName,
    timelineAccentClassName,
    addButtonClassName,
    updateButtonClassName,
    sliderClassName,
    metaClassName,
    onSeek,
    onActivateSlider,
    onSelectKeyMoment,
    onChangeKeyMomentTime,
    onAddKeyMoment,
    onUpdateSelectedKeyMoment,
    onDeleteSelectedKeyMoment,
}: VideoPlaybackSectionProps) {
    const selectedKeyMoment = selectedKeyMomentId
        ? keyMoments.find((keyMoment) => keyMoment.id === selectedKeyMomentId) ?? null
        : null;

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                    {label}
                </span>
                <span className="text-gray-800 dark:text-gray-200 font-mono text-sm">
                    {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                </span>
            </div>
            <div>
                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={seekAmount}
                    value={currentTime}
                    onFocus={() => onActivateSlider(videoIndex)}
                    onPointerDown={() => onActivateSlider(videoIndex)}
                    onChange={(event) => onSeek(parseFloat(event.target.value))}
                    className={sliderClassName}
                />
            </div>
            <div className={`mt-2 flex items-center justify-between text-[11px] font-medium ${metaClassName}`}>
                <span>{label} keyframe slider</span>
                <span>{selectedPosition ? `${formatVideoTime(selectedPosition.time)} • frame ${selectedPosition.frame}` : 'No selected key'}</span>
            </div>
            <div className="mt-2">
                <KeyMomentTimeline
                    duration={duration}
                    keyMoments={keyMoments}
                    videoIndex={videoIndex}
                    selectedKeyMomentId={selectedKeyMomentId}
                    accentClassName={timelineAccentClassName}
                    onSelectKeyMoment={onSelectKeyMoment}
                    onChangeKeyMomentTime={onChangeKeyMomentTime}
                />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <button
                    type="button"
                    onClick={onAddKeyMoment}
                    className={addButtonClassName}
                >
                    Add Key
                </button>
                {selectedKeyMoment && (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onUpdateSelectedKeyMoment(selectedKeyMoment.id)}
                            className={updateButtonClassName}
                        >
                            Snap selected key to current {label} frame
                        </button>
                        <button
                            type="button"
                            onClick={() => onDeleteSelectedKeyMoment(selectedKeyMoment.id)}
                            className="font-medium text-red-600 transition-colors hover:text-red-700"
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>
            {fps && (
                <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{label} FPS:</span>
                    <span className={`font-mono ${accentClassName}`}>{fps} fps ({seekAmount.toFixed(4)}s/frame)</span>
                </div>
            )}
        </div>
    );
}