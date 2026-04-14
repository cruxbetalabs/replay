'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { OverlaySettingsPanel } from '../OverlaySettingsPanel';
import { MouseControlPanel } from '../MouseControlPanel';
import { SwipeStatsPanel } from '../SwipeStatsPanel';
import { OverlayComparisonStage } from '../OverlayComparisonStage';
import { VideoControlPanel } from '../VideoControlPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useComparisonShortcuts } from '../../hooks/useComparisonShortcuts';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useKeyMoments } from '../../hooks/useKeyMoments';
import { useMouseControl } from '../../hooks/useMouseControl';
import { useOverlaySettings } from '../../hooks/useOverlaySettings';
import { useVideoControl } from '../../hooks/useVideoControl';
import { useVideoFps } from '../../hooks/useVideoFps';
import type { KeyMoment } from '../../lib/key-moments';
import type { TrajectoryMetadata } from '../../lib/trajectory-types';

interface SplitViewContentProps {
    calculatingByIndex: [boolean, boolean];
    trajectoryHistoryWindowSec: number | null;
    visibleTrajectoryTrackNames: string[];
    showPose: boolean;
}

interface ReplayComparisonWorkspaceProps {
    // Adapters supply the split-view stage, while the workspace injects shared UI state
    // like current track visibility, pose toggles, history window, and FPS activity.
    splitViewContent: (props: SplitViewContentProps) => ReactNode;
    videoRefs: [RefObject<HTMLVideoElement | null>, RefObject<HTMLVideoElement | null>];
    videoUrls: [string | null, string | null];
    overlayMetadataByIndex: [TrajectoryMetadata | null, TrajectoryMetadata | null];
    canRenderOverlayByIndex: [boolean, boolean];
    availableTrajectoryTrackNames: string[];
    hasAnyOverlayData: boolean;
    hasPoseMetadata: boolean;
    title?: string;
    storageKey?: string | null;
    showRemoveVideos?: boolean;
    onRemoveVideo1?: () => void;
    onRemoveVideo2?: () => void;
    onKeyMomentsChange?: (keyMoments: KeyMoment[]) => void;
}

export function ReplayComparisonWorkspace({
    splitViewContent,
    videoRefs,
    videoUrls,
    overlayMetadataByIndex,
    canRenderOverlayByIndex,
    availableTrajectoryTrackNames,
    hasAnyOverlayData,
    hasPoseMetadata,
    title = 'Switch between split playback and shared overlay inspection.',
    storageKey = null,
    showRemoveVideos = true,
    onRemoveVideo1,
    onRemoveVideo2,
    onKeyMomentsChange,
}: ReplayComparisonWorkspaceProps) {
    const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split');
    const hasVideoByIndex: [boolean, boolean] = [Boolean(videoUrls[0]), Boolean(videoUrls[1])];

    const { boxRef, direction, speed, movement, controlMode } = useMouseControl({ controlMode: 'both' });
    const { fps, fpsByIndex, calculatingByIndex } = useVideoFps({
        videoRefs,
        videoUrls,
    });

    const fps1 = fpsByIndex[0];
    const fps2 = fpsByIndex[1];
    const seekAmount1 = fps1 ? 1 / fps1 : 1 / 30;
    const seekAmount2 = fps2 ? 1 / fps2 : 1 / 30;

    const { currentTime1, currentTime2, duration1, duration2, seekTo1, seekTo2 } = useVideoControl({
        videoRefs,
        videoUrls,
        direction,
        movement,
        fps,
    });

    const {
        keyMoments,
        selectedKeyMomentId,
        setActivePlaybackSliderIndex,
        createKeyMomentFromVideo,
        updateKeyMomentFromVideo,
        jumpToKeyMoment,
        deleteKeyMoment,
        setKeyMomentTime,
        keyMomentShortcuts,
        addKeyShortcut,
    } = useKeyMoments({
        currentTimeByIndex: [currentTime1, currentTime2],
        durationByIndex: [duration1, duration2],
        fpsByIndex: [fps1, fps2],
        hasVideoByIndex,
        videoRefs,
        seekToByIndex: [seekTo1, seekTo2],
        persistenceKey: storageKey,
        onKeyMomentsChange,
    });

    const {
        showPose,
        trajectoryHistorySeconds,
        trajectoryHistoryWindowSec,
        hiddenTrajectoryTrackNames,
        visibleTrajectoryTrackNames,
        setTrajectoryHistorySeconds,
        toggleTrajectoryTrack,
        showAllTrajectoryTracks,
        hideAllTrajectoryTracks,
        togglePose,
    } = useOverlaySettings({ availableTrajectoryTrackNames });

    const resolvedViewMode = viewMode === 'overlay' && !hasAnyOverlayData ? 'split' : viewMode;

    const handleSetViewMode = useCallback((nextViewMode: 'split' | 'overlay') => {
        setViewMode(nextViewMode === 'overlay' && !hasAnyOverlayData ? 'split' : nextViewMode);
    }, [hasAnyOverlayData]);

    const { shortcuts, enabled: areShortcutsEnabled } = useComparisonShortcuts({
        addKeyShortcut,
        keyMomentShortcuts,
        availableTrajectoryTrackNames,
        hasAnyOverlayData,
        hasPoseMetadata,
        resolvedViewMode,
        onSetViewMode: handleSetViewMode,
        onTogglePose: togglePose,
        onToggleTrajectoryTrack: toggleTrajectoryTrack,
    });

    useKeyboardShortcuts({
        shortcuts,
        enabled: areShortcutsEnabled,
    });

    const hasVideos = Boolean(videoUrls[0] || videoUrls[1]);

    return (
        <div className="flex h-full w-full min-h-0 overflow-hidden bg-zinc-50 font-sans dark:bg-black">
            <div className="w-2/3 h-full flex flex-col p-8 gap-6 bg-white dark:bg-black">
                <Tabs
                    value={resolvedViewMode}
                    onValueChange={(value) => handleSetViewMode(value as 'split' | 'overlay')}
                    className="min-h-0 flex-1 flex-col"
                >
                    <div className="flex shrink-0 flex-col">
                        <h2 className="mb-3 mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                            {title}
                        </h2>
                        <TabsList className="self-start">
                            <TabsTrigger value="split" className="min-w-24">
                                Split View
                            </TabsTrigger>
                            <TabsTrigger value="overlay" disabled={!hasAnyOverlayData} className="min-w-24">
                                Overlay View
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="split" forceMount className="min-h-0 flex-1 data-[state=inactive]:hidden">
                        <div className="flex h-full gap-4 min-h-0">
                            {/* Keep split view synchronized with the workspace-owned overlay settings. */}
                            {splitViewContent({
                                calculatingByIndex: [calculatingByIndex[0] ?? false, calculatingByIndex[1] ?? false],
                                trajectoryHistoryWindowSec,
                                visibleTrajectoryTrackNames,
                                showPose,
                            })}
                        </div>
                    </TabsContent>

                    <TabsContent value="overlay" className="min-h-0 flex-1 data-[state=inactive]:hidden">
                        {/* Overlay view consumes the same visibility and pose state as split view. */}
                        <OverlayComparisonStage
                            videoRef1={videoRefs[0]}
                            videoRef2={videoRefs[1]}
                            metadata1={overlayMetadataByIndex[0]}
                            metadata2={overlayMetadataByIndex[1]}
                            canRender1={canRenderOverlayByIndex[0]}
                            canRender2={canRenderOverlayByIndex[1]}
                            visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                            historyWindowSec={trajectoryHistoryWindowSec}
                            showPose={showPose}
                        />
                    </TabsContent>
                </Tabs>

                <MouseControlPanel
                    boxRef={boxRef}
                    direction={direction}
                    controlMode={controlMode}
                />
            </div>

            <div className="w-1/3 h-full flex flex-col p-8 gap-6 bg-gray-50 dark:bg-gray-950 border-l-4 border-gray-300 dark:border-gray-700 overflow-y-auto">
                <VideoControlPanel
                    hasVideos={hasVideos}
                    hasVideo1={hasVideoByIndex[0]}
                    hasVideo2={hasVideoByIndex[1]}
                    duration1={duration1}
                    duration2={duration2}
                    currentTime1={currentTime1}
                    currentTime2={currentTime2}
                    fps1={fps1}
                    fps2={fps2}
                    seekAmount1={seekAmount1}
                    seekAmount2={seekAmount2}
                    keyMoments={keyMoments}
                    selectedKeyMomentId={selectedKeyMomentId}
                    onSeek1={seekTo1}
                    onSeek2={seekTo2}
                    onPlaybackSliderActivate={setActivePlaybackSliderIndex}
                    onCreateKeyMomentFromVideo1={() => createKeyMomentFromVideo(0)}
                    onCreateKeyMomentFromVideo2={() => createKeyMomentFromVideo(1)}
                    onJumpToKeyMoment={jumpToKeyMoment}
                    onSelectKeyMoment={jumpToKeyMoment}
                    onSetKeyMomentTime1={(keyMomentId, time) => setKeyMomentTime(keyMomentId, 0, time)}
                    onSetKeyMomentTime2={(keyMomentId, time) => setKeyMomentTime(keyMomentId, 1, time)}
                    onUpdateKeyMomentFromVideo1={(keyMomentId) => updateKeyMomentFromVideo(keyMomentId, 0)}
                    onUpdateKeyMomentFromVideo2={(keyMomentId) => updateKeyMomentFromVideo(keyMomentId, 1)}
                    onDeleteKeyMoment={deleteKeyMoment}
                    showRemoveVideos={showRemoveVideos}
                    onRemoveVideo1={onRemoveVideo1}
                    onRemoveVideo2={onRemoveVideo2}
                />

                <SwipeStatsPanel
                    direction={direction}
                    speed={speed}
                />

                {/* Settings mutate the same state that drives both tabs above. */}
                <OverlaySettingsPanel
                    trajectoryHistorySeconds={trajectoryHistorySeconds}
                    trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                    hasPoseMetadata={hasPoseMetadata}
                    showPose={showPose}
                    availableTrajectoryTrackNames={availableTrajectoryTrackNames}
                    hiddenTrajectoryTrackNames={hiddenTrajectoryTrackNames}
                    visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                    onSetTrajectoryHistorySeconds={setTrajectoryHistorySeconds}
                    onTogglePose={togglePose}
                    onShowAllTracks={showAllTrajectoryTracks}
                    onHideAllTracks={hideAllTrajectoryTracks}
                    onToggleTrajectoryTrack={toggleTrajectoryTrack}
                />
            </div>
        </div>
    );
}