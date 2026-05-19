'use client';

import { useMemo } from 'react';
import type { KeyboardShortcut } from './useKeyboardShortcuts';

interface UseComparisonShortcutsOptions {
    addKeyShortcut: KeyboardShortcut;
    keyMomentShortcuts: KeyboardShortcut[];
    availableTrajectoryTrackNames: string[];
    hasAnyOverlayData: boolean;
    hasPoseMetadata: boolean;
    resolvedViewMode: 'split' | 'overlay';
    onSetViewMode: (nextViewMode: 'split' | 'overlay') => void;
    onTogglePose: () => void;
    onToggleTrajectory: () => void;
    onToggleTrajectoryTrack: (trackName: string) => void;
    onResetPose?: () => void;
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
    onToggleTrajectory,
    onToggleTrajectoryTrack,
    onResetPose,
}: UseComparisonShortcutsOptions) {

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

    const resetPoseShortcut = useMemo<KeyboardShortcut>(() => ({
        key: '\\',
        enabled: hasPoseMetadata,
        onTrigger: () => onResetPose?.(),
    }), [hasPoseMetadata, onResetPose]);

    const shortcuts = useMemo(() => [addKeyShortcut, ...viewShortcuts, resetPoseShortcut, ...keyMomentShortcuts], [addKeyShortcut, keyMomentShortcuts, resetPoseShortcut, viewShortcuts]);
    const enabled = Boolean(
        keyMomentShortcuts.length > 0
        || hasPoseMetadata
        || availableTrajectoryTrackNames.length > 0
        || addKeyShortcut.enabled
        || hasAnyOverlayData,
    );

    return {
        shortcuts,
        enabled,
    };
}