'use client';

import React from 'react';
import { KeyMomentTimeline } from './KeyMomentTimeline';

interface KeyMomentPosition {
    time: number;
    frame: number;
}

interface KeyMoment {
    id: string;
    positions: [KeyMomentPosition | null, KeyMomentPosition | null];
}

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
    onCreateKeyMomentFromVideo1: () => void;
    onCreateKeyMomentFromVideo2: () => void;
    onJumpToKeyMoment: (keyMomentId: string) => void;
    onSelectKeyMoment: (keyMomentId: string) => void;
    onSetKeyMomentTime1: (keyMomentId: string, time: number) => void;
    onSetKeyMomentTime2: (keyMomentId: string, time: number) => void;
    onUpdateKeyMomentFromVideo1: (keyMomentId: string) => void;
    onUpdateKeyMomentFromVideo2: (keyMomentId: string) => void;
    onDeleteKeyMoment: (keyMomentId: string) => void;
    onRemoveVideo1: () => void;
    onRemoveVideo2: () => void;
}

const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

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
    onCreateKeyMomentFromVideo1,
    onCreateKeyMomentFromVideo2,
    onJumpToKeyMoment,
    onSelectKeyMoment,
    onSetKeyMomentTime1,
    onSetKeyMomentTime2,
    onUpdateKeyMomentFromVideo1,
    onUpdateKeyMomentFromVideo2,
    onDeleteKeyMoment,
    onRemoveVideo1,
    onRemoveVideo2,
}: VideoControlPanelProps) {
    if (!hasVideos) return null;

    // Use the longer duration for display
    const maxDuration = Math.max(duration1, duration2);
    const selectedKeyMoment = selectedKeyMomentId
        ? keyMoments.find((keyMoment) => keyMoment.id === selectedKeyMomentId) ?? null
        : null;
    const selectedKeyIndex = selectedKeyMoment
        ? keyMoments.findIndex((keyMoment) => keyMoment.id === selectedKeyMoment.id)
        : -1;
    const selectedPosition1 = selectedKeyMoment?.positions[0] ?? null;
    const selectedPosition2 = selectedKeyMoment?.positions[1] ?? null;

    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                Video Controls
            </h2>
            <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Max Duration:</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">
                        {formatTime(maxDuration)}
                    </span>
                </div>
                {hasVideo1 && fps1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Video 1 FPS:</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{fps1} fps ({seekAmount1.toFixed(4)}s/frame)</span>
                    </div>
                )}
                {hasVideo2 && fps2 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Video 2 FPS:</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{fps2} fps ({seekAmount2.toFixed(4)}s/frame)</span>
                    </div>
                )}
                <div>
                    <button
                        onClick={() => {
                            if (hasVideo1) onRemoveVideo1();
                            if (hasVideo2) onRemoveVideo2();
                        }}
                        className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium text-sm"
                    >
                        Remove Videos
                    </button>
                </div>
                {hasVideo1 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                Video 1
                            </span>
                            <span className="text-gray-800 dark:text-gray-200 font-mono text-sm">
                                {formatTime(currentTime1)} / {formatTime(duration1)}
                            </span>
                        </div>
                        <div>
                            <input
                                type="range"
                                min={0}
                                max={duration1 || 0}
                                step={seekAmount1}
                                value={currentTime1}
                                onChange={(e) => onSeek1(parseFloat(e.target.value))}
                                className="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
                            />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-blue-700 dark:text-blue-300">
                            <span>Video 1 keyframe slider</span>
                            <span>{selectedPosition1 ? `${formatTime(selectedPosition1.time)} • frame ${selectedPosition1.frame}` : 'No selected key'}</span>
                        </div>
                        <div className="mt-2">
                            <KeyMomentTimeline
                                duration={duration1}
                                keyMoments={keyMoments}
                                videoIndex={0}
                                selectedKeyMomentId={selectedKeyMomentId}
                                accentClassName="bg-white border-blue-600 text-blue-700"
                                onSelectKeyMoment={onSelectKeyMoment}
                                onChangeKeyMomentTime={onSetKeyMomentTime1}
                            />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                            <button
                                onClick={onCreateKeyMomentFromVideo1}
                                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 font-medium text-blue-700 transition-colors hover:bg-blue-100"
                            >
                                Add Key
                            </button>
                            {selectedKeyMoment && (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => onUpdateKeyMomentFromVideo1(selectedKeyMoment.id)}
                                        className="font-medium text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-300"
                                    >
                                        Snap selected key to current Video 1 frame
                                    </button>
                                    <button
                                        onClick={() => onDeleteKeyMoment(selectedKeyMoment.id)}
                                        className="font-medium text-red-600 transition-colors hover:text-red-700"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {hasVideo2 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                Video 2
                            </span>
                            <span className="text-gray-800 dark:text-gray-200 font-mono text-sm">
                                {formatTime(currentTime2)} / {formatTime(duration2)}
                            </span>
                        </div>
                        <div>
                            <input
                                type="range"
                                min={0}
                                max={duration2 || 0}
                                step={seekAmount2}
                                value={currentTime2}
                                onChange={(e) => onSeek2(parseFloat(e.target.value))}
                                className="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600 hover:accent-green-700"
                            />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-green-700 dark:text-green-300">
                            <span>Video 2 keyframe slider</span>
                            <span>{selectedPosition2 ? `${formatTime(selectedPosition2.time)} • frame ${selectedPosition2.frame}` : 'No selected key'}</span>
                        </div>
                        <div className="mt-2">
                            <KeyMomentTimeline
                                duration={duration2}
                                keyMoments={keyMoments}
                                videoIndex={1}
                                selectedKeyMomentId={selectedKeyMomentId}
                                accentClassName="bg-white border-green-600 text-green-700"
                                onSelectKeyMoment={onSelectKeyMoment}
                                onChangeKeyMomentTime={onSetKeyMomentTime2}
                            />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                            <button
                                onClick={onCreateKeyMomentFromVideo2}
                                className="rounded-md border border-green-200 bg-green-50 px-3 py-2 font-medium text-green-700 transition-colors hover:bg-green-100"
                            >
                                Add Key
                            </button>
                            {selectedKeyMoment && (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => onUpdateKeyMomentFromVideo2(selectedKeyMoment.id)}
                                        className="font-medium text-green-700 transition-colors hover:text-green-800 dark:text-green-300"
                                    >
                                        Snap selected key to current Video 2 frame
                                    </button>
                                    <button
                                        onClick={() => onDeleteKeyMoment(selectedKeyMoment.id)}
                                        className="font-medium text-red-600 transition-colors hover:text-red-700"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}