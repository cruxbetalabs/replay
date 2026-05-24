'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject, MutableRefObject } from 'react';
import { OverlayComparisonStage } from '../OverlayComparisonStage';
import { MouseControlPanel } from '../MouseControlPanel';
import { KeyboardShortcutsDialog } from '../KeyboardShortcutsDialog';
import { ReplayComparisonSidebar } from './ReplayComparisonSidebar';
import { ReplayMenubar } from './ReplayMenubar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useComparisonShortcuts } from '../../hooks/useComparisonShortcuts';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useKeyMoments } from '../../hooks/useKeyMoments';
import { useMouseControl } from '../../hooks/useMouseControl';
import { useOverlaySettings } from '../../hooks/useOverlaySettings';
import { useVideoControl } from '../../hooks/useVideoControl';
import { useVideoFps } from '../../hooks/useVideoFps';
import type { KeyMoment } from '../../lib/key-moments';
import type { TrajectoryMetadata, VelocityColorPreset } from '../../lib/trajectory-types';
import type { PresetComparison } from '../../lib/presets';
import type { VideoIndex } from '../../lib/key-moments';
import type { ActiveCloudUpload, CloudJobSummary } from '../../lib/replay-cloud/types';

export interface SplitViewContentProps {
    calculatingByIndex: [boolean, boolean];
    trajectoryHistoryWindowSec: number | null;
    visibleTrajectoryTrackNames: string[];
    showPose: boolean;
    resetIKRefs: [MutableRefObject<(() => void) | null>, MutableRefObject<(() => void) | null>];
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
    storageKey?: string | null;
    showRemoveVideos?: boolean;
    onRemoveVideo1?: () => void;
    onRemoveVideo2?: () => void;
    onRemoveMetadata?: () => void;
    onKeyMomentsChange?: (keyMoments: KeyMoment[]) => void;
    presets?: PresetComparison[];
    onLoadPreset?: (preset: PresetComparison) => void;
    presetKeyMomentsStamp?: string | null;
    presetKeyMomentsState?: { keyMoments: KeyMoment[]; selectedKeyMomentId: string | null } | null;
    cloudEnabled?: boolean;
    cloudBootstrapped?: boolean;
    cloudConnecting?: boolean;
    cloudConnectionError?: string | null;
    cloudJobs?: CloudJobSummary[];
    cloudActiveUpload?: ActiveCloudUpload | null;
    cloudInProgressCount?: number;
    onCloudUpload?: (file: File) => Promise<void>;
    onLoadCloudJob?: (jobId: string, videoIndex: VideoIndex) => Promise<void>;
    onDownloadCloudJobMetadata?: (jobId: string) => Promise<void>;
    onDeleteCloudJob?: (jobId: string) => Promise<void>;
    onRefreshCloudJobs?: () => void;
    onClearCloudUpload?: () => void;
    isLoadingCloudJob?: boolean;
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
    storageKey = null,
    showRemoveVideos = true,
    onRemoveVideo1,
    onRemoveVideo2,
    onRemoveMetadata,
    onKeyMomentsChange,
    presets,
    onLoadPreset,
    presetKeyMomentsStamp,
    presetKeyMomentsState,
    cloudEnabled = false,
    cloudBootstrapped = false,
    cloudConnecting = false,
    cloudConnectionError = null,
    cloudJobs = [],
    cloudActiveUpload = null,
    cloudInProgressCount = 0,
    onCloudUpload,
    onLoadCloudJob,
    onDownloadCloudJobMetadata,
    onDeleteCloudJob,
    onRefreshCloudJobs,
    onClearCloudUpload,
    isLoadingCloudJob = false,
}: ReplayComparisonWorkspaceProps) {
    const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split');
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const hasVideoByIndex: [boolean, boolean] = [Boolean(videoUrls[0]), Boolean(videoUrls[1])];

    const velocityColorPreset = useMemo<VelocityColorPreset | null>(() => {
        const meta = overlayMetadataByIndex[0] ?? overlayMetadataByIndex[1];
        if (!meta) return null;
        const presetName = meta.style.defaultVelocityColorPreset;
        return meta.style.velocityColorPresets[presetName] ?? null;
    }, [overlayMetadataByIndex]);

    const splitResetRef1 = useRef<(() => void) | null>(null);
    const splitResetRef2 = useRef<(() => void) | null>(null);
    const overlayResetRef = useRef<(() => void) | null>(null);
    const resetIKRefs: [MutableRefObject<(() => void) | null>, MutableRefObject<(() => void) | null>] = [splitResetRef1, splitResetRef2];

    const handleResetPose = useCallback(() => {
        splitResetRef1.current?.();
        splitResetRef2.current?.();
        overlayResetRef.current?.();
    }, []);

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
        deselectKeyMoment,
        setKeyMomentTime,
        keyMomentShortcuts,
        addKeyShortcut,
        resetKeyMoments,
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
    } = useOverlaySettings({ availableTrajectoryTrackNames });

    const effectiveVisibleTrackNames = showTrajectory ? visibleTrajectoryTrackNames : [];

    const appliedPresetStampRef = useRef<string | null>(null);
    useEffect(() => {
        if (!presetKeyMomentsStamp || presetKeyMomentsStamp === appliedPresetStampRef.current) return;
        appliedPresetStampRef.current = presetKeyMomentsStamp;
        if (presetKeyMomentsState) {
            resetKeyMoments(presetKeyMomentsState.keyMoments, presetKeyMomentsState.selectedKeyMomentId);
        }
    }, [presetKeyMomentsStamp, presetKeyMomentsState, resetKeyMoments]);

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
        onToggleTrajectory: toggleTrajectory,
        onToggleTrajectoryTrack: toggleTrajectoryTrack,
        onResetPose: handleResetPose,
    });

    useKeyboardShortcuts({
        shortcuts,
        enabled: areShortcutsEnabled,
    });

    useEffect(() => {
        const isTypingTarget = (target: EventTarget | null) => {
            if (!(target instanceof HTMLElement)) return false;
            if (target.isContentEditable) return true;
            if (target instanceof HTMLTextAreaElement) return true;
            if (target instanceof HTMLInputElement) {
                return !['range', 'button', 'checkbox', 'radio', 'file', 'submit'].includes(target.type);
            }
            return false;
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isTypingTarget(e.target)) return;
            if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setShortcutsOpen((prev) => !prev);
            } else if (e.key === '[') {
                e.preventDefault();
                togglePose();
            } else if (e.key === ']') {
                e.preventDefault();
                toggleTrajectory();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePose, toggleTrajectory]);

    const hasVideos = Boolean(videoUrls[0] || videoUrls[1]);

    return (
        <div className="flex h-full w-full min-h-0 overflow-hidden bg-zinc-50 font-sans dark:bg-black">
            <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} cloudEnabled={cloudEnabled} />
            <div className="flex-1 min-w-0 h-full flex flex-col p-5 gap-6 bg-white dark:bg-black">
                <Tabs
                    value={resolvedViewMode}
                    onValueChange={(value) => handleSetViewMode(value as 'split' | 'overlay')}
                    className="min-h-0 flex-1 flex-col"
                >
                    <div className="flex shrink-0 items-center justify-between">
                        <ReplayMenubar
                            resolvedViewMode={resolvedViewMode}
                            hasAnyOverlayData={hasAnyOverlayData}
                            onSetViewMode={handleSetViewMode}
                            hasVideo1={hasVideoByIndex[0]}
                            hasVideo2={hasVideoByIndex[1]}
                            showRemoveVideos={showRemoveVideos}
                            onRemoveVideo1={onRemoveVideo1}
                            onRemoveVideo2={onRemoveVideo2}
                            onRemoveMetadata={onRemoveMetadata}
                            onOpenShortcuts={() => setShortcutsOpen(true)}
                            presets={presets}
                            onLoadPreset={onLoadPreset}
                            cloudEnabled={cloudEnabled}
                            cloudBootstrapped={cloudBootstrapped}
                            cloudJobs={cloudJobs}
                            cloudInProgressCount={cloudInProgressCount}
                            onRefreshCloudJobs={onRefreshCloudJobs}
                            onLoadCloudJob={onLoadCloudJob}
                            onDownloadCloudJobMetadata={onDownloadCloudJobMetadata}
                            onDeleteCloudJob={onDeleteCloudJob}
                            isLoadingCloudJob={isLoadingCloudJob}
                        />
                        <div className="flex items-center gap-2">
                            <TabsList>
                                <TabsTrigger value="split" className="min-w-24">
                                    Split View
                                </TabsTrigger>
                                <TabsTrigger value="overlay" disabled={!hasAnyOverlayData} className="min-w-24">
                                    Overlay View
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    <TabsContent value="split" forceMount className="min-h-0 flex-1 data-[state=inactive]:hidden">
                        <div className="flex h-full gap-4 min-h-0">
                            {/* Keep split view synchronized with the workspace-owned overlay settings. */}
                            {splitViewContent({
                                calculatingByIndex: [calculatingByIndex[0] ?? false, calculatingByIndex[1] ?? false],
                                trajectoryHistoryWindowSec,
                                visibleTrajectoryTrackNames: effectiveVisibleTrackNames,
                                showPose,
                                resetIKRefs,
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
                            visibleTrajectoryTrackNames={effectiveVisibleTrackNames}
                            historyWindowSec={trajectoryHistoryWindowSec}
                            showPose={showPose}
                            resetIKRef={overlayResetRef}
                        />
                    </TabsContent>
                </Tabs>

                <MouseControlPanel
                    boxRef={boxRef}
                    direction={direction}
                    controlMode={controlMode}
                />
            </div>

            <ReplayComparisonSidebar
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
                onDeselectKeyMoment={deselectKeyMoment}
                onSetKeyMomentTime1={(keyMomentId, time) => setKeyMomentTime(keyMomentId, 0, time)}
                onSetKeyMomentTime2={(keyMomentId, time) => setKeyMomentTime(keyMomentId, 1, time)}
                onUpdateKeyMomentFromVideo1={(keyMomentId) => updateKeyMomentFromVideo(keyMomentId, 0)}
                onUpdateKeyMomentFromVideo2={(keyMomentId) => updateKeyMomentFromVideo(keyMomentId, 1)}
                onDeleteKeyMoment={deleteKeyMoment}
                showRemoveVideos={showRemoveVideos}
                onRemoveVideo1={onRemoveVideo1}
                onRemoveVideo2={onRemoveVideo2}
                direction={direction}
                speed={speed}
                hasAnyOverlayData={hasAnyOverlayData}
                trajectoryHistorySeconds={trajectoryHistorySeconds}
                trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                showTrajectory={showTrajectory}
                hasPoseMetadata={hasPoseMetadata}
                showPose={showPose}
                availableTrajectoryTrackNames={availableTrajectoryTrackNames}
                hiddenTrajectoryTrackNames={hiddenTrajectoryTrackNames}
                visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                onSetTrajectoryHistorySeconds={setTrajectoryHistorySeconds}
                onToggleTrajectory={toggleTrajectory}
                onTogglePose={togglePose}
                onShowAllTracks={showAllTrajectoryTracks}
                onHideAllTracks={hideAllTrajectoryTracks}
                onToggleTrajectoryTrack={toggleTrajectoryTrack}
                onRemoveMetadata={onRemoveMetadata}
                velocityColorPreset={velocityColorPreset}
                cloudEnabled={cloudEnabled}
                cloudBootstrapped={cloudBootstrapped}
                cloudConnecting={cloudConnecting}
                cloudConnectionError={cloudConnectionError}
                cloudActiveUpload={cloudActiveUpload}
                cloudJobs={cloudJobs}
                onCloudUpload={onCloudUpload}
                onLoadCloudJob={onLoadCloudJob}
                onDownloadCloudJobMetadata={onDownloadCloudJobMetadata}
                onDeleteCloudJob={onDeleteCloudJob}
                onClearCloudUpload={onClearCloudUpload}
                isLoadingCloudJob={isLoadingCloudJob}
            />
        </div>
    );
}