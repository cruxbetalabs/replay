'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_TRAJECTORY_HISTORY_SECONDS = 0.5;

interface UseOverlaySettingsOptions {
    availableTrajectoryTrackNames: string[];
}

export function useOverlaySettings({ availableTrajectoryTrackNames }: UseOverlaySettingsOptions) {
    const [showTrajectory, setShowTrajectory] = useState(true);
    const [showPose, setShowPose] = useState(true);
    const [trajectoryHistorySeconds, setTrajectoryHistorySeconds] = useState<number>(DEFAULT_TRAJECTORY_HISTORY_SECONDS);
    const [hiddenTrajectoryTrackNames, setHiddenTrajectoryTrackNames] = useState<string[]>([]);

    const showPoseRef = useRef(showPose);
    const showTrajectoryRef = useRef(showTrajectory);
    const analysisOverlaySnapshotRef = useRef<{ showPose: boolean; showTrajectory: boolean } | null>(null);

    useEffect(() => {
        showPoseRef.current = showPose;
        showTrajectoryRef.current = showTrajectory;
    }, [showPose, showTrajectory]);

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

    /** Turns off pose and trajectory overlays (e.g. when entering annotate mode). */
    const hideAnalysisOverlays = useCallback(() => {
        if (analysisOverlaySnapshotRef.current === null) {
            analysisOverlaySnapshotRef.current = {
                showPose: showPoseRef.current,
                showTrajectory: showTrajectoryRef.current,
            };
        }
        setShowPose(false);
        setShowTrajectory(false);
    }, []);

    /** Restores pose/trajectory visibility saved when annotate mode last started. */
    const restoreAnalysisOverlays = useCallback(() => {
        const snapshot = analysisOverlaySnapshotRef.current;
        if (!snapshot) {
            return;
        }
        setShowPose(snapshot.showPose);
        setShowTrajectory(snapshot.showTrajectory);
        analysisOverlaySnapshotRef.current = null;
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
        hideAnalysisOverlays,
        restoreAnalysisOverlays,
    };
}