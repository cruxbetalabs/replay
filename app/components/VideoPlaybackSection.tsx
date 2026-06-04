'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KeyMomentTimeline } from './KeyMomentTimeline';
import { formatVideoTime, type KeyMoment, type KeyMomentPosition, type VideoIndex } from '../lib/key-moments';
import styles from './VideoPlaybackSection.module.css';

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
    onSeek: (time: number) => void;
    onSeekCommit?: () => void;
    onActivateSlider: (videoIndex: VideoIndex) => void;
    onSelectKeyMoment: (keyMomentId: string) => void;
    onDeselectKeyMoment: () => void;
    onChangeKeyMomentTime: (keyMomentId: string, time: number) => void;
    mode: 'playback' | 'keyframes';
    onCreateKeyMoment?: () => void;
    onDeleteKeyMoment?: (keyMomentId: string) => void;
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
    onSeek,
    onSeekCommit,
    onActivateSlider,
    onSelectKeyMoment,
    onDeselectKeyMoment,
    onChangeKeyMomentTime,
    mode,
    onCreateKeyMoment,
    onDeleteKeyMoment,
}: VideoPlaybackSectionProps) {
    const accentClassName = 'text-gray-800 dark:text-gray-200';
    const timelineAccentClassName = videoIndex === 0
        ? 'bg-white border-blue-600 text-blue-700'
        : 'bg-white border-green-600 text-green-700';
    const playbackProgressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const playbackTrackClassName = [
        styles.playbackSliderTrack,
        videoIndex === 0 ? styles.playbackSliderVideo1 : styles.playbackSliderVideo2,
    ].filter(Boolean).join(' ');
    const playbackSliderClassName = [
        styles.playbackSlider,
        videoIndex === 0 ? styles.playbackSliderVideo1 : styles.playbackSliderVideo2,
    ].filter(Boolean).join(' ');
    const metaClassName = videoIndex === 0
        ? 'text-blue-700 dark:text-blue-300'
        : 'text-green-700 dark:text-green-300';

    const handlePlaybackSliderActivate = () => {
        onActivateSlider(videoIndex);
        onDeselectKeyMoment();
    };

    if (mode === 'playback') {
        return (
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                        aria-label={`${label} playback position`}
                        onFocus={handlePlaybackSliderActivate}
                        onPointerDown={handlePlaybackSliderActivate}
                        onPointerUp={() => onSeekCommit?.()}
                        onChange={(event) => onSeek(parseFloat(event.target.value))}
                        className={playbackSliderClassName}
                    />
                </div>
            </div>
        );
    }

    return (
        <div>
            <KeyMomentTimeline
                duration={duration}
                keyMoments={keyMoments}
                videoIndex={videoIndex}
                selectedKeyMomentId={selectedKeyMomentId}
                accentClassName={timelineAccentClassName}
                trackClassName={styles.keyframeTrack}
                onSelectKeyMoment={onSelectKeyMoment}
                onDeselectKeyMoment={onDeselectKeyMoment}
                onChangeKeyMomentTime={onChangeKeyMomentTime}
            />
            <div className="mt-2 flex items-center gap-2">
                {onCreateKeyMoment && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={onCreateKeyMoment}
                    >
                        <Plus />
                        Keyframe
                    </Button>
                )}
                {onDeleteKeyMoment && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto h-7 px-2 text-red-500 hover:text-red-500 disabled:opacity-30"
                        disabled={!selectedKeyMomentId}
                        onClick={() => selectedKeyMomentId && onDeleteKeyMoment(selectedKeyMomentId)}
                        aria-label={`Delete selected key moment from ${label}`}
                    >
                        <Trash2 />
                    </Button>
                )}
            </div>
        </div>
    );
}
