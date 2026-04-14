'use client';

import { useCallback, useMemo, useState } from 'react';
import { OverlaySettingsPanel } from './components/OverlaySettingsPanel';
import { MouseControlPanel } from './components/MouseControlPanel';
import { OverlayComparisonStage } from './components/OverlayComparisonStage';
import { VideoControlPanel } from './components/VideoControlPanel';
import { VideoDropzone } from './components/VideoDropzone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useComparisonShortcuts } from './hooks/useComparisonShortcuts';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useKeyMoments } from './hooks/useKeyMoments';
import { useMouseControl } from './hooks/useMouseControl';
import { useOverlaySettings } from './hooks/useOverlaySettings';
import { useTrajectoryState } from './hooks/useTrajectoryState';
import { useVideoControl } from './hooks/useVideoControl';
import { useVideoFps } from './hooks/useVideoFps';
import { useVideoSources } from './hooks/useVideoSources';
import { getKeyMomentStorageKey } from './lib/key-moments';

export default function Home() {
  const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split');
  const {
    videoUrl1: videoUrl,
    videoUrl2,
    videoRef1: videoRef,
    videoRef2,
    videoRefs,
    videoUrls,
    replaceVideoSource,
    removeVideo,
    videoSources,
  } = useVideoSources();
  const hasVideoByIndex: [boolean, boolean] = [Boolean(videoUrl), Boolean(videoUrl2)];
  const {
    trajectoryByIndex,
    overlayMetadataByIndex,
    trajectoryWarningsByIndex,
    canRenderOverlayByIndex,
    availableTrajectoryTrackNames,
    hasAnyOverlayData,
    hasPoseMetadata,
    handleTrajectoryUpload,
    clearTrajectory,
    updateVideoDimensions,
    clearVideoDimensions,
  } = useTrajectoryState({ hasVideoByIndex });

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
  const keyMomentStorageKey = useMemo(() => getKeyMomentStorageKey(videoSources), [videoSources]);
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
    persistenceKey: keyMomentStorageKey,
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

  const hasVideos = !!(videoUrl || videoUrl2);

  const handleReplaceVideo = useCallback((videoIndex: 0 | 1, file: File) => {
    clearVideoDimensions(videoIndex);
    replaceVideoSource(videoIndex, file);
  }, [clearVideoDimensions, replaceVideoSource]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (file && file.type.startsWith('video/')) {
      handleReplaceVideo(0, file);
    }
  }, [handleReplaceVideo]);

  const handleFileUpload2 = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (file && file.type.startsWith('video/')) {
      handleReplaceVideo(1, file);
    }
  }, [handleReplaceVideo]);

  const handleRemoveVideo1 = useCallback(() => {
    clearVideoDimensions(0);
    removeVideo(0);
  }, [clearVideoDimensions, removeVideo]);

  const handleRemoveVideo2 = useCallback(() => {
    clearVideoDimensions(1);
    removeVideo(1);
  }, [clearVideoDimensions, removeVideo]);


  return (
    <div className="flex h-screen w-screen bg-zinc-50 font-sans dark:bg-black overflow-hidden">
      {/* Left Side - Video Area (2/3 width) */}
      <div className="w-2/3 h-full flex flex-col p-8 gap-6 bg-white dark:bg-black">
        <Tabs
          value={resolvedViewMode}
          onValueChange={(value) => handleSetViewMode(value as 'split' | 'overlay')}
          className="min-h-0 flex-1 flex-col"
        >
          <div className="flex shrink-0 flex-col gap-3">
            <div>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Switch between split playback and shared overlay inspection.
              </h2>
            </div>
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
              <VideoDropzone
                label="Video 1"
                videoUrl={videoUrl}
                ref={videoRef}
                onUpload={handleFileUpload}
                isCalculating={calculatingByIndex[0]}
                trajectoryMetadata={overlayMetadataByIndex[0]}
                trajectoryFileName={trajectoryByIndex[0].fileName}
                trajectoryError={trajectoryByIndex[0].error}
                trajectoryWarnings={trajectoryWarningsByIndex[0]}
                canRenderTrajectory={canRenderOverlayByIndex[0]}
                trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                showPose={showPose}
                onTrajectoryUpload={(event) => handleTrajectoryUpload(0, event)}
                onRemoveTrajectory={() => clearTrajectory(0)}
                onVideoMetadataLoad={(metadata) => updateVideoDimensions(0, metadata)}
              />
              <VideoDropzone
                label="Video 2"
                videoUrl={videoUrl2}
                ref={videoRef2}
                onUpload={handleFileUpload2}
                isCalculating={calculatingByIndex[1]}
                trajectoryMetadata={overlayMetadataByIndex[1]}
                trajectoryFileName={trajectoryByIndex[1].fileName}
                trajectoryError={trajectoryByIndex[1].error}
                trajectoryWarnings={trajectoryWarningsByIndex[1]}
                canRenderTrajectory={canRenderOverlayByIndex[1]}
                trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                showPose={showPose}
                onTrajectoryUpload={(event) => handleTrajectoryUpload(1, event)}
                onRemoveTrajectory={() => clearTrajectory(1)}
                onVideoMetadataLoad={(metadata) => updateVideoDimensions(1, metadata)}
              />
            </div>
          </TabsContent>

          <TabsContent value="overlay" className="min-h-0 flex-1 data-[state=inactive]:hidden">
            <OverlayComparisonStage
              videoRef1={videoRef}
              videoRef2={videoRef2}
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

        {/* Designated Swipe Control Area */}
        <MouseControlPanel
          boxRef={boxRef}
          direction={direction}
          controlMode={controlMode}
        />
      </div>

      {/* Right Side - Controls & Stats Area (1/3 width) */}
      <div className="w-1/3 h-full flex flex-col p-8 gap-6 bg-gray-50 dark:bg-gray-950 border-l-4 border-gray-300 dark:border-gray-700 overflow-y-auto">
        <VideoControlPanel
          hasVideos={hasVideos}
          hasVideo1={!!videoUrl}
          hasVideo2={!!videoUrl2}
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
          onRemoveVideo1={handleRemoveVideo1}
          onRemoveVideo2={handleRemoveVideo2}
        />

        <OverlaySettingsPanel
          direction={direction}
          speed={speed}
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
          onToggleTrajectoryTrack={toggleTrajectoryTrack}
        />
      </div>
    </div>
  );
}
