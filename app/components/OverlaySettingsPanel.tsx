'use client';

import { useMemo } from 'react';
import { RotateCcwIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SidebarPanel } from './SidebarPanel';

const BODY_TRACK_LAYOUT = [
    {
        trackName: 'head',
        label: 'Head',
        className: 'left-1/2 top-3 -translate-x-1/2',
    },
    {
        trackName: 'left_hand',
        label: 'Left Hand',
        className: 'left-[14%] top-[22%]',
    },
    {
        trackName: 'right_hand',
        label: 'Right Hand',
        className: 'right-[14%] top-[22%]',
    },
    {
        trackName: 'upper_body_center',
        label: 'Upper Body',
        className: 'left-1/2 top-[34%] -translate-x-1/2',
    },
    {
        trackName: 'hip_mid',
        label: 'Hip',
        className: 'left-1/2 top-[56%] -translate-x-1/2',
    },
    {
        trackName: 'left_foot',
        label: 'Left Foot',
        className: 'left-[28%] bottom-3 -translate-x-1/2',
    },
    {
        trackName: 'right_foot',
        label: 'Right Foot',
        className: 'left-[72%] bottom-3 -translate-x-1/2',
    },
] as const;

const BODY_TRACK_NAMES: ReadonlySet<string> = new Set(BODY_TRACK_LAYOUT.map((track) => track.trackName));

const formatTrackLabel = (trackName: string) => trackName
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

interface OverlaySettingsPanelProps {
    trajectoryHistorySeconds: number;
    trajectoryHistoryWindowSec: number | null;
    showTrajectory: boolean;
    hasPoseMetadata: boolean;
    showPose: boolean;
    availableTrajectoryTrackNames: string[];
    hiddenTrajectoryTrackNames: string[];
    visibleTrajectoryTrackNames: string[];
    onSetTrajectoryHistorySeconds: (value: number) => void;
    onToggleTrajectory: () => void;
    onTogglePose: () => void;
    onShowAllTracks: () => void;
    onHideAllTracks: () => void;
    onToggleTrajectoryTrack: (trackName: string) => void;
    onRemoveMetadata?: () => void;
}

export function OverlaySettingsPanel({
    trajectoryHistorySeconds,
    trajectoryHistoryWindowSec,
    showTrajectory,
    hasPoseMetadata,
    showPose,
    availableTrajectoryTrackNames,
    hiddenTrajectoryTrackNames,
    visibleTrajectoryTrackNames,
    onSetTrajectoryHistorySeconds,
    onToggleTrajectory,
    onTogglePose,
    onShowAllTracks,
    onHideAllTracks,
    onToggleTrajectoryTrack,
    onRemoveMetadata,
}: OverlaySettingsPanelProps) {
    const visibleTrackNameSet = useMemo(() => new Set(visibleTrajectoryTrackNames), [visibleTrajectoryTrackNames]);
    const availableTrackNameSet = useMemo(() => new Set(availableTrajectoryTrackNames), [availableTrajectoryTrackNames]);
    const extraTrackNames = useMemo(
        () => availableTrajectoryTrackNames.filter((trackName) => !BODY_TRACK_NAMES.has(trackName)),
        [availableTrajectoryTrackNames],
    );
    const allTracksVisible = availableTrajectoryTrackNames.length > 0 && hiddenTrajectoryTrackNames.length === 0;

    return (
        <SidebarPanel
            title="Overlay Settings"
            className="flex-1 space-y-3"
            action={
                onRemoveMetadata ? (
                    <button
                        type="button"
                        onClick={onRemoveMetadata}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        aria-label="Remove metadata"
                    >
                        <RotateCcwIcon className="h-4 w-4" />
                    </button>
                ) : undefined
            }
        >

            <div className="space-y-4">

                <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
                    <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Pose Overlay
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            {hasPoseMetadata ? 'Show pose landmarks' : 'Unavailable'}
                        </p>
                    </div>
                    <Switch
                        checked={hasPoseMetadata && showPose}
                        onCheckedChange={(checked) => {
                            if (hasPoseMetadata && checked !== showPose) {
                                onTogglePose();
                            }
                        }}
                        disabled={!hasPoseMetadata}
                        aria-label="Toggle pose overlay"
                    />
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
                    <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Trajectory Overlay
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Show movement trajectories
                        </p>
                    </div>
                    <Switch
                        checked={showTrajectory}
                        onCheckedChange={onToggleTrajectory}
                        aria-label="Toggle trajectory overlay"
                    />
                </div>
            </div>

            {showTrajectory && (
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Trajectory History
                        </span>
                        <span className="font-mono text-sm text-gray-800 dark:text-gray-200">
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
                        className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-gray-300 accent-cyan-600 hover:accent-cyan-700 dark:bg-gray-700"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
                        <span>0.0s keeps the full history visible</span>
                        <span>Limit trail length client-side</span>
                    </div>
                </div>
            )}


            {showTrajectory && <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Visible Trajectories:
                        </p>
                    </div>
                    {availableTrajectoryTrackNames.length > 0 && (
                        <button
                            type="button"
                            onClick={allTracksVisible ? onHideAllTracks : onShowAllTracks}
                            className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[11px] font-semibold text-cyan-700 transition-colors hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-300"
                        >
                            {allTracksVisible ? 'Hide All' : 'Show All'}
                        </button>
                    )}
                </div>

                {availableTrajectoryTrackNames.length > 0 ? (
                    <fieldset className="space-y-4">
                        <div className="relative h-88 w-full overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-b from-cyan-50 to-white px-4 py-5 dark:border-cyan-950/60 dark:from-cyan-950/20 dark:to-gray-900">
                            <div className="pointer-events-none absolute left-1/2 top-[16%] h-[44%] w-px -translate-x-1/2 bg-cyan-200 dark:bg-cyan-900" />
                            <div className="pointer-events-none absolute left-1/2 top-[26%] h-px w-[46%] -translate-x-1/2 bg-cyan-200 dark:bg-cyan-900" />
                            <div className="pointer-events-none absolute left-1/2 top-[60%] h-px w-[22%] -translate-x-1/2 bg-cyan-200 dark:bg-cyan-900" />
                            <div className="pointer-events-none absolute left-[40%] top-[60%] h-[24%] w-px bg-cyan-200 dark:bg-cyan-900" />
                            <div className="pointer-events-none absolute left-[60%] top-[60%] h-[24%] w-px bg-cyan-200 dark:bg-cyan-900" />

                            {BODY_TRACK_LAYOUT.map((track) => {
                                const isAvailable = availableTrackNameSet.has(track.trackName);
                                const isVisible = visibleTrackNameSet.has(track.trackName);

                                return (
                                    <button
                                        key={track.trackName}
                                        type="button"
                                        aria-pressed={isAvailable ? isVisible : false}
                                        onClick={() => {
                                            if (isAvailable) {
                                                onToggleTrajectoryTrack(track.trackName);
                                            }
                                        }}
                                        disabled={!isAvailable}
                                        className={`absolute min-w-26 rounded-full border px-3 py-2 text-center text-xs font-semibold shadow-sm transition-all ${track.className} ${isAvailable
                                            ? isVisible
                                                ? 'border-cyan-500 bg-cyan-500 text-white shadow-cyan-200 dark:border-cyan-400 dark:bg-cyan-400 dark:text-cyan-950 dark:shadow-transparent'
                                                : 'border-gray-200 bg-white text-gray-500 hover:border-cyan-300 hover:text-cyan-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-cyan-700 dark:hover:text-cyan-300'
                                            : 'cursor-not-allowed border-dashed border-gray-200 bg-gray-100 text-gray-400 shadow-none dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-500'
                                            }`}
                                    >
                                        <span className="block leading-tight">{track.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {extraTrackNames.length > 0 && (
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                    Extra Tracks
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {extraTrackNames.map((trackName) => {
                                        const isVisible = visibleTrackNameSet.has(trackName);

                                        return (
                                            <label
                                                key={trackName}
                                                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                                            >
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {formatTrackLabel(trackName)}
                                                </span>
                                                <Switch
                                                    checked={isVisible}
                                                    onCheckedChange={() => onToggleTrajectoryTrack(trackName)}
                                                    aria-label={`Toggle ${formatTrackLabel(trackName)}`}
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </fieldset>
                ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                        Upload metadata JSON to populate track toggles.
                    </div>
                )}
            </div>}
        </SidebarPanel>
    );
}