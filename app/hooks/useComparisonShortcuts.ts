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

    const shortcuts = useMemo(() => [addKeyShortcut, ...viewShortcuts, ...keyMomentShortcuts], [addKeyShortcut, keyMomentShortcuts, viewShortcuts]);
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