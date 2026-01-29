'use client';

import React from 'react';

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
    onSeek1: (time: number) => void;
    onSeek2: (time: number) => void;
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
    onSeek1,
    onSeek2,
    onRemoveVideo1,
    onRemoveVideo2,
}: VideoControlPanelProps) {
    if (!hasVideos) return null;

    // Use the longer duration for display
    const maxDuration = Math.max(duration1, duration2);

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
                )}
            </div>
        </div>
    );
}