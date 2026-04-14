'use client';

interface OverlaySettingsPanelProps {
    direction: 'left' | 'right' | 'none';
    speed: number;
    trajectoryHistorySeconds: number;
    trajectoryHistoryWindowSec: number | null;
    hasPoseMetadata: boolean;
    showPose: boolean;
    availableTrajectoryTrackNames: string[];
    hiddenTrajectoryTrackNames: string[];
    visibleTrajectoryTrackNames: string[];
    onSetTrajectoryHistorySeconds: (value: number) => void;
    onTogglePose: () => void;
    onShowAllTracks: () => void;
    onToggleTrajectoryTrack: (trackName: string) => void;
}

export function OverlaySettingsPanel({
    direction,
    speed,
    trajectoryHistorySeconds,
    trajectoryHistoryWindowSec,
    hasPoseMetadata,
    showPose,
    availableTrajectoryTrackNames,
    hiddenTrajectoryTrackNames,
    visibleTrajectoryTrackNames,
    onSetTrajectoryHistorySeconds,
    onTogglePose,
    onShowAllTracks,
    onToggleTrajectoryTrack,
}: OverlaySettingsPanelProps) {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg flex-1">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                Swipe Stats
            </h2>

            <div className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                            Direction
                        </span>
                        <span className={`px-3 py-1 rounded-full font-medium text-sm ${direction === 'left'
                            ? 'bg-purple-500 text-white'
                            : direction === 'right'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-400 text-white'
                            }`}>
                            {direction === 'left' ? '← Left' : direction === 'right' ? 'Right →' : 'None'}
                        </span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                            Speed
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 font-mono text-sm">
                            {speed.toFixed(1)} px/event
                        </span>
                    </div>
                    <div className="w-full bg-gray-300 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-100"
                            style={{ width: `${Math.min(speed * 2, 100)}%` }}
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                            Trajectory History
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 font-mono text-sm">
                            {trajectoryHistoryWindowSec == null ? 'Full trail' : `${trajectoryHistorySeconds.toFixed(1)}s`}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={5}
                        step={0.1}
                        value={trajectoryHistorySeconds}
                        onChange={(event) => onSetTrajectoryHistorySeconds(parseFloat(event.target.value))}
                        className="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-600 hover:accent-cyan-700"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
                        <span>0.0s keeps the full history visible</span>
                        <span>Limit trail length client-side</span>
                    </div>
                </div>

                <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                Pose Overlay
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Draw skeleton lines and landmark dots from the pose block.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (hasPoseMetadata) {
                                onTogglePose();
                            }
                        }}
                        aria-pressed={hasPoseMetadata ? showPose : false}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${hasPoseMetadata
                            ? showPose
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100'
                                : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            : 'cursor-not-allowed border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-500'
                            }`}
                    >
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                            {hasPoseMetadata ? (showPose ? 'Visible' : 'Hidden') : 'Unavailable'}
                        </span>
                        <span className="mt-1 block text-sm font-semibold leading-tight">
                            {hasPoseMetadata ? 'Pose landmarks and skeleton' : 'Upload metadata with a pose block to enable this'}
                        </span>
                    </button>
                </div>

                <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                Visible Trajectories
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Default is all tracks. Toggle any row item to hide or show it.
                            </p>
                        </div>
                        {availableTrajectoryTrackNames.length > 0 && hiddenTrajectoryTrackNames.length > 0 && (
                            <button
                                type="button"
                                onClick={onShowAllTracks}
                                className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[11px] font-semibold text-cyan-700 transition-colors hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-300"
                            >
                                Show All
                            </button>
                        )}
                    </div>

                    {availableTrajectoryTrackNames.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {availableTrajectoryTrackNames.map((trackName) => {
                                const isVisible = visibleTrajectoryTrackNames.includes(trackName);

                                return (
                                    <button
                                        key={trackName}
                                        type="button"
                                        aria-pressed={isVisible}
                                        onClick={() => onToggleTrajectoryTrack(trackName)}
                                        className={`min-w-[7rem] rounded-xl border px-4 py-3 text-left transition-colors ${isVisible
                                            ? 'border-cyan-500 bg-cyan-50 text-cyan-900 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-100'
                                            : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                            }`}
                                    >
                                        <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                                            {isVisible ? 'Visible' : 'Hidden'}
                                        </span>
                                        <span className="mt-1 block text-sm font-semibold leading-tight">
                                            {trackName}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                            Upload metadata JSON to populate track toggles.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}