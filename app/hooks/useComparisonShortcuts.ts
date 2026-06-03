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
    hasVideos?: boolean;
    onToggleAnnotateForAll?: () => void;
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
    hasVideos = false,
    onToggleAnnotateForAll,
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

    const toggleAnnotateShortcut = useMemo<KeyboardShortcut>(() => ({
        key: ';',
        enabled: hasVideos && Boolean(onToggleAnnotateForAll),
        onTrigger: () => onToggleAnnotateForAll?.(),
    }), [hasVideos, onToggleAnnotateForAll]);

    const shortcuts = useMemo(
        () => [addKeyShortcut, ...viewShortcuts, resetPoseShortcut, toggleAnnotateShortcut, ...keyMomentShortcuts],
        [addKeyShortcut, keyMomentShortcuts, resetPoseShortcut, toggleAnnotateShortcut, viewShortcuts],
    );
    const enabled = Boolean(
        keyMomentShortcuts.length > 0
        || hasPoseMetadata
        || availableTrajectoryTrackNames.length > 0
        || addKeyShortcut.enabled
        || hasAnyOverlayData
        || hasVideos,
    );

    return {
        shortcuts,
        enabled,
    };
}