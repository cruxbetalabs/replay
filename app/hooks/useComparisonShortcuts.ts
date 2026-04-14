'use client';

import { useMemo } from 'react';
import type { KeyboardShortcut } from './useKeyboardShortcuts';

const OVERLAY_TRACK_SHORTCUT_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] as const;
const PREFERRED_TRAJECTORY_TRACK_ORDER = [
    'hip_mid',
    'upper_body_center',
    'head',
    'left_hand',
    'right_hand',
    'left_foot',
    'right_foot',
] as const;

interface UseComparisonShortcutsOptions {
    addKeyShortcut: KeyboardShortcut;
    keyMomentShortcuts: KeyboardShortcut[];
    availableTrajectoryTrackNames: string[];
    hasAnyOverlayData: boolean;
    hasPoseMetadata: boolean;
    resolvedViewMode: 'split' | 'overlay';
    onSetViewMode: (nextViewMode: 'split' | 'overlay') => void;
    onTogglePose: () => void;
    onToggleTrajectoryTrack: (trackName: string) => void;
}

export function useComparisonShortcuts({
    addKeyShortcut,
    keyMomentShortcuts,
    availableTrajectoryTrackNames,
    hasAnyOverlayData,
    hasPoseMetadata,
    resolvedViewMode,
    onSetViewMode,
    onTogglePose,
    onToggleTrajectoryTrack,
}: UseComparisonShortcutsOptions) {
    const trajectoryTrackShortcutNames = useMemo(() => {
        const preferredTrackNames = PREFERRED_TRAJECTORY_TRACK_ORDER.filter((trackName) => availableTrajectoryTrackNames.includes(trackName));
        const preferredTrackNameSet = new Set<string>(preferredTrackNames);
        const remainingTrackNames = availableTrajectoryTrackNames.filter((trackName) => !preferredTrackNameSet.has(trackName));

        return [...preferredTrackNames, ...remainingTrackNames].slice(0, OVERLAY_TRACK_SHORTCUT_KEYS.length);
    }, [availableTrajectoryTrackNames]);

    const overlayShortcuts = useMemo<KeyboardShortcut[]>(() => {
        const poseShortcut: KeyboardShortcut = {
            key: '\\',
            enabled: hasPoseMetadata,
            onTrigger: () => {
                if (hasPoseMetadata) {
                    onTogglePose();
                }
            },
        };

        const trajectoryShortcuts = trajectoryTrackShortcutNames.map((trackName, index) => ({
            key: OVERLAY_TRACK_SHORTCUT_KEYS[index],
            enabled: availableTrajectoryTrackNames.includes(trackName),
            onTrigger: () => onToggleTrajectoryTrack(trackName),
        }));

        return [poseShortcut, ...trajectoryShortcuts];
    }, [availableTrajectoryTrackNames, hasPoseMetadata, onTogglePose, onToggleTrajectoryTrack, trajectoryTrackShortcutNames]);

    const viewShortcuts = useMemo<KeyboardShortcut[]>(() => ([
        {
            key: ',',
            enabled: resolvedViewMode !== 'split',
            onTrigger: () => onSetViewMode('split'),
        },
        {
            key: '.',
            enabled: hasAnyOverlayData && resolvedViewMode !== 'overlay',
            onTrigger: () => onSetViewMode('overlay'),
        },
    ]), [hasAnyOverlayData, onSetViewMode, resolvedViewMode]);

    const shortcuts = useMemo(() => [addKeyShortcut, ...viewShortcuts, ...overlayShortcuts, ...keyMomentShortcuts], [addKeyShortcut, keyMomentShortcuts, overlayShortcuts, viewShortcuts]);
    const enabled = Boolean(
        keyMomentShortcuts.length > 0
        || hasPoseMetadata
        || availableTrajectoryTrackNames.length > 0
        || addKeyShortcut.enabled,
    );

    return {
        shortcuts,
        enabled,
    };
}