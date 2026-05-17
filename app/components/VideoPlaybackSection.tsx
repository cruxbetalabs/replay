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
    sliderClassName: string;
    metaClassName: string;
    onSeek: (time: number) => void;
    onActivateSlider: (videoIndex: VideoIndex) => void;
    onSelectKeyMoment: (keyMomentId: string) => void;
    onDeselectKeyMoment: () => void;
    onChangeKeyMomentTime: (keyMomentId: string, time: number) => void;
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
    sliderClassName,
    metaClassName,
    onSeek,
    onActivateSlider,
    onSelectKeyMoment,
    onDeselectKeyMoment,
    onChangeKeyMomentTime,
}: VideoPlaybackSectionProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                    {label}
                </span>
                <span className="flex items-center justify-center gap-2 font-mono text-xs">
                    {fps && (
                        <>
                            <span className={accentClassName}>{fps} fps ({seekAmount.toFixed(2)}s/frame)</span>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                        </>
                    )}
                    <span className="text-gray-800 dark:text-gray-200">
                        {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                    </span>
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
                <span>{selectedPosition ? `Frame ${selectedPosition.frame}` : 'No selected key'}</span>
            </div>
            <div className="mt-2">
                <KeyMomentTimeline
                    duration={duration}
                    keyMoments={keyMoments}
                    videoIndex={videoIndex}
                    selectedKeyMomentId={selectedKeyMomentId}
                    accentClassName={timelineAccentClassName}
                    onSelectKeyMoment={onSelectKeyMoment}
                    onDeselectKeyMoment={onDeselectKeyMoment}
                    onChangeKeyMomentTime={onChangeKeyMomentTime}
                />
            </div>
        </div>
    );
}