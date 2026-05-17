'use client';

import { VideoPlaybackSection } from './VideoPlaybackSection';
import { type KeyMoment } from '../lib/key-moments';

interface VideoControlPanelProps {
    hasVideos: boolean;
    hasVideo1: boolean;
    hasVideo2: boolean;
    duration1: number;
    duration2: number;
    currentTime1: number;
    currentTime2: number;
    fps1: number | null;
    fps2: number | null;
    seekAmount1: number;
    seekAmount2: number;
    keyMoments: KeyMoment[];
    selectedKeyMomentId: string | null;
    onSeek1: (time: number) => void;
    onSeek2: (time: number) => void;
    onPlaybackSliderActivate: (videoIndex: 0 | 1) => void;
    onCreateKeyMomentFromVideo1: () => void;
    onCreateKeyMomentFromVideo2: () => void;
    onJumpToKeyMoment: (keyMomentId: string) => void;
    onSelectKeyMoment: (keyMomentId: string) => void;
    onSetKeyMomentTime1: (keyMomentId: string, time: number) => void;
    onSetKeyMomentTime2: (keyMomentId: string, time: number) => void;
    onUpdateKeyMomentFromVideo1: (keyMomentId: string) => void;
    onUpdateKeyMomentFromVideo2: (keyMomentId: string) => void;
    onDeleteKeyMoment: (keyMomentId: string) => void;
    showRemoveVideos?: boolean;
    onRemoveVideo1?: () => void;
    onRemoveVideo2?: () => void;
}

export function VideoControlPanel({
    hasVideos,
    hasVideo1,
    hasVideo2,
    duration1,
    duration2,
    currentTime1,
    currentTime2,
    fps1,
    fps2,
    seekAmount1,
    seekAmount2,
    keyMoments,
    selectedKeyMomentId,
    onSeek1,
    onSeek2,
    onPlaybackSliderActivate,
    onCreateKeyMomentFromVideo1,
    onCreateKeyMomentFromVideo2,
    onJumpToKeyMoment,
    onSelectKeyMoment,
    onSetKeyMomentTime1,
    onSetKeyMomentTime2,
    onUpdateKeyMomentFromVideo1,
    onUpdateKeyMomentFromVideo2,
    onDeleteKeyMoment,
    showRemoveVideos = true,
    onRemoveVideo1,
    onRemoveVideo2,
}: VideoControlPanelProps) {
    if (!hasVideos) return null;

    const selectedKeyMoment = selectedKeyMomentId
        ? keyMoments.find((keyMoment) => keyMoment.id === selectedKeyMomentId) ?? null
        : null;
    const selectedPosition1 = selectedKeyMoment?.positions[0] ?? null;
    const selectedPosition2 = selectedKeyMoment?.positions[1] ?? null;

    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                Video Controls
            </h2>
            <div className="space-y-4">
                {showRemoveVideos && (onRemoveVideo1 || onRemoveVideo2) && (
                    <div>
                        <button
                            type="button"
                            onClick={() => {
                                if (hasVideo1) onRemoveVideo1?.();
                                if (hasVideo2) onRemoveVideo2?.();
                            }}
                            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium text-sm"
                        >
                            Remove Videos
                        </button>
                    </div>
                )}
                {hasVideo1 && (
                    <VideoPlaybackSection
                        label="Video 1"
                        videoIndex={0}
                        currentTime={currentTime1}
                        duration={duration1}
                        fps={fps1}
                        seekAmount={seekAmount1}
                        keyMoments={keyMoments}
                        selectedKeyMomentId={selectedKeyMomentId}
                        selectedPosition={selectedPosition1}
                        accentClassName="text-gray-800 dark:text-gray-200"
                        timelineAccentClassName="bg-white border-blue-600 text-blue-700"
                        addButtonClassName="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 font-medium text-blue-700 transition-colors hover:bg-blue-100"
                        updateButtonClassName="font-medium text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-300"
                        sliderClassName="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
                        metaClassName="text-blue-700 dark:text-blue-300"
                        onSeek={onSeek1}
                        onActivateSlider={onPlaybackSliderActivate}
                        onSelectKeyMoment={onSelectKeyMoment}
                        onChangeKeyMomentTime={onSetKeyMomentTime1}
                        onAddKeyMoment={onCreateKeyMomentFromVideo1}
                        onUpdateSelectedKeyMoment={onUpdateKeyMomentFromVideo1}
                        onDeleteSelectedKeyMoment={onDeleteKeyMoment}
                    />
                )}
                {hasVideo2 && (
                    <VideoPlaybackSection
                        label="Video 2"
                        videoIndex={1}
                        currentTime={currentTime2}
                        duration={duration2}
                        fps={fps2}
                        seekAmount={seekAmount2}
                        keyMoments={keyMoments}
                        selectedKeyMomentId={selectedKeyMomentId}
                        selectedPosition={selectedPosition2}
                        accentClassName="text-gray-800 dark:text-gray-200"
                        timelineAccentClassName="bg-white border-green-600 text-green-700"
                        addButtonClassName="rounded-md border border-green-200 bg-green-50 px-3 py-2 font-medium text-green-700 transition-colors hover:bg-green-100"
                        updateButtonClassName="font-medium text-green-700 transition-colors hover:text-green-800 dark:text-green-300"
                        sliderClassName="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600 hover:accent-green-700"
                        metaClassName="text-green-700 dark:text-green-300"
                        onSeek={onSeek2}
                        onActivateSlider={onPlaybackSliderActivate}
                        onSelectKeyMoment={onSelectKeyMoment}
                        onChangeKeyMomentTime={onSetKeyMomentTime2}
                        onAddKeyMoment={onCreateKeyMomentFromVideo2}
                        onUpdateSelectedKeyMoment={onUpdateKeyMomentFromVideo2}
                        onDeleteSelectedKeyMoment={onDeleteKeyMoment}
                    />
                )}
            </div>
        </div>
    );
}