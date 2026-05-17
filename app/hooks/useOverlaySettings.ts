'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_TRAJECTORY_HISTORY_SECONDS = 0.5;

interface UseOverlaySettingsOptions {
    availableTrajectoryTrackNames: string[];
}

export function useOverlaySettings({ availableTrajectoryTrackNames }: UseOverlaySettingsOptions) {
    const [showTrajectory, setShowTrajectory] = useState(true);
    const [showPose, setShowPose] = useState(true);
    const [trajectoryHistorySeconds, setTrajectoryHistorySeconds] = useState<number>(DEFAULT_TRAJECTORY_HISTORY_SECONDS);
    const [hiddenTrajectoryTrackNames, setHiddenTrajectoryTrackNames] = useState<string[]>([]);

    useEffect(() => {
        setHiddenTrajectoryTrackNames((prev) => prev.filter((trackName) => availableTrajectoryTrackNames.includes(trackName)));
    }, [availableTrajectoryTrackNames]);

    const trajectoryHistoryWindowSec = trajectoryHistorySeconds <= 0 ? null : trajectoryHistorySeconds;

    const visibleTrajectoryTrackNames = useMemo(() => (
        availableTrajectoryTrackNames.filter((trackName) => !hiddenTrajectoryTrackNames.includes(trackName))
    ), [availableTrajectoryTrackNames, hiddenTrajectoryTrackNames]);

    const toggleTrajectoryTrack = useCallback((trackName: string) => {
        setHiddenTrajectoryTrackNames((prev) => (
            prev.includes(trackName)
                ? prev.filter((name) => name !== trackName)
                : [...prev, trackName]
        ));
    }, []);

    const showAllTrajectoryTracks = useCallback(() => {
        setHiddenTrajectoryTrackNames([]);
    }, []);

    const hideAllTrajectoryTracks = useCallback(() => {
        setHiddenTrajectoryTrackNames(availableTrajectoryTrackNames);
    }, [availableTrajectoryTrackNames]);

    const toggleTrajectory = useCallback(() => {
        setShowTrajectory((prev) => !prev);
    }, []);

    const togglePose = useCallback(() => {
        setShowPose((prev) => !prev);
    }, []);

    return {
        showTrajectory,
        showPose,
        trajectoryHistorySeconds,
        trajectoryHistoryWindowSec,
        hiddenTrajectoryTrackNames,
        visibleTrajectoryTrackNames,
        setTrajectoryHistorySeconds,
        toggleTrajectoryTrack,
        showAllTrajectoryTracks,
        hideAllTrajectoryTracks,
        toggleTrajectory,
        togglePose,
    };
}