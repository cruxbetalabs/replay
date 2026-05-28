'use client';

import { OverlaySettingsPanel } from '../OverlaySettingsPanel';
import { SwipeStatsPanel } from '../SwipeStatsPanel';
import { VideoControlPanel } from '../VideoControlPanel';
import { OnboardingContent } from './OnboardingContent';
import type { KeyMoment, VideoIndex } from '../../lib/key-moments';
import type { VelocityColorPreset } from '../../lib/trajectory-types';
import type { ActiveCloudUpload, CloudJobSummary } from '../../lib/replay-cloud/types';
import { EMPTY_CLOUD_JOBS } from '../../lib/empty-arrays';

interface ReplayComparisonSidebarProps {
    // Video control
    hasVideos: boolean;
    hasVideo1: boolean;
    hasVideo2: boolean;
    duration1: number;
    duration2: number;
    currentTime1: number;
    currentTime2: number;
    fps1: number | null;
    fps2: number | null;
    seekAmount1: number;
    seekAmount2: number;
    keyMoments: KeyMoment[];
    selectedKeyMomentId: string | null;
    onSeek1: (time: number) => void;
    onSeek2: (time: number) => void;
    onPlaybackSliderActivate: (videoIndex: 0 | 1) => void;
    onCreateKeyMomentFromVideo1: () => void;
    onCreateKeyMomentFromVideo2: () => void;
    onJumpToKeyMoment: (keyMomentId: string) => void;
    onSelectKeyMoment: (keyMomentId: string) => void;
    onDeselectKeyMoment: () => void;
    onSetKeyMomentTime1: (keyMomentId: string, time: number) => void;
    onSetKeyMomentTime2: (keyMomentId: string, time: number) => void;
    onUpdateKeyMomentFromVideo1: (keyMomentId: string) => void;
    onUpdateKeyMomentFromVideo2: (keyMomentId: string) => void;
    onDeleteKeyMoment: (keyMomentId: string) => void;
    showRemoveVideos?: boolean;
    onRemoveVideo1?: () => void;
    onRemoveVideo2?: () => void;
    // Swipe stats
    direction: 'left' | 'right' | 'none';
    speed: number;
    // Overlay settings
    hasAnyOverlayData: boolean;
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
    velocityColorPreset?: VelocityColorPreset | null;
    cloudEnabled?: boolean;
    cloudBootstrapped?: boolean;
    cloudConnecting?: boolean;
    cloudConnectionError?: string | null;
    cloudActiveUpload?: ActiveCloudUpload | null;
    cloudJobs?: CloudJobSummary[];
    onCloudUpload?: (file: File) => Promise<void>;
    onLoadCloudJob?: (jobId: string, videoIndex: VideoIndex) => Promise<void>;
    onDownloadCloudJobMetadata?: (jobId: string) => Promise<void>;
    onDeleteCloudJob?: (jobId: string) => Promise<void>;
    onClearCloudUpload?: () => void;
    isLoadingCloudJob?: boolean;
}

export function ReplayComparisonSidebar({
    hasVideos,
    hasVideo1,
    hasVideo2,
    duration1,
    duration2,
    currentTime1,
    currentTime2,
    fps1,
    fps2,
    seekAmount1,
    seekAmount2,
    keyMoments,
    selectedKeyMomentId,
    onSeek1,
    onSeek2,
    onPlaybackSliderActivate,
    onCreateKeyMomentFromVideo1,
    onCreateKeyMomentFromVideo2,
    onJumpToKeyMoment,
    onSelectKeyMoment,
    onDeselectKeyMoment,
    onSetKeyMomentTime1,
    onSetKeyMomentTime2,
    onUpdateKeyMomentFromVideo1,
    onUpdateKeyMomentFromVideo2,
    onDeleteKeyMoment,
    showRemoveVideos,
    onRemoveVideo1,
    onRemoveVideo2,
    direction,
    speed,
    trajectoryHistorySeconds,
    trajectoryHistoryWindowSec,
    showTrajectory,
    hasPoseMetadata,
    showPose,
    availableTrajectoryTrackNames,
    hiddenTrajectoryTrackNames,
    visibleTrajectoryTrackNames,
    onSetTrajectoryHistorySeconds,
    hasAnyOverlayData,
    onToggleTrajectory,
    onTogglePose,
    onShowAllTracks,
    onHideAllTracks,
    onToggleTrajectoryTrack,
    onRemoveMetadata,
    velocityColorPreset,
    cloudEnabled = false,
    cloudBootstrapped = false,
    cloudConnecting = false,
    cloudConnectionError = null,
    cloudActiveUpload = null,
    cloudJobs = EMPTY_CLOUD_JOBS,
    onCloudUpload,
    onLoadCloudJob,
    onDownloadCloudJobMetadata,
    onDeleteCloudJob,
    onClearCloudUpload,
    isLoadingCloudJob = false,
}: ReplayComparisonSidebarProps) {
    return (
        <div className="w-md shrink-0 h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 border-l border-gray-200 dark:border-gray-700">
            <div className="flex flex-col">
                {!hasVideos && (
                    <OnboardingContent
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
                )}
                <VideoControlPanel
                    hasVideos={hasVideos}
                    hasVideo1={hasVideo1}
                    hasVideo2={hasVideo2}
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
                    onSeek1={onSeek1}
                    onSeek2={onSeek2}
                    onPlaybackSliderActivate={onPlaybackSliderActivate}
                    onCreateKeyMomentFromVideo1={onCreateKeyMomentFromVideo1}
                    onCreateKeyMomentFromVideo2={onCreateKeyMomentFromVideo2}
                    onJumpToKeyMoment={onJumpToKeyMoment}
                    onSelectKeyMoment={onSelectKeyMoment}
                    onDeselectKeyMoment={onDeselectKeyMoment}
                    onSetKeyMomentTime1={onSetKeyMomentTime1}
                    onSetKeyMomentTime2={onSetKeyMomentTime2}
                    onUpdateKeyMomentFromVideo1={onUpdateKeyMomentFromVideo1}
                    onUpdateKeyMomentFromVideo2={onUpdateKeyMomentFromVideo2}
                    onDeleteKeyMoment={onDeleteKeyMoment}
                    showRemoveVideos={showRemoveVideos}
                    onRemoveVideo1={onRemoveVideo1}
                    onRemoveVideo2={onRemoveVideo2}
                    onRemoveMetadata={onRemoveMetadata}
                />

                {/* <SwipeStatsPanel
                direction={direction}
                speed={speed}
            /> */}

                {hasAnyOverlayData && <OverlaySettingsPanel
                    trajectoryHistorySeconds={trajectoryHistorySeconds}
                    trajectoryHistoryWindowSec={trajectoryHistoryWindowSec}
                    showTrajectory={showTrajectory}
                    hasPoseMetadata={hasPoseMetadata}
                    showPose={showPose}
                    availableTrajectoryTrackNames={availableTrajectoryTrackNames}
                    hiddenTrajectoryTrackNames={hiddenTrajectoryTrackNames}
                    visibleTrajectoryTrackNames={visibleTrajectoryTrackNames}
                    onSetTrajectoryHistorySeconds={onSetTrajectoryHistorySeconds}
                    onToggleTrajectory={onToggleTrajectory}
                    onTogglePose={onTogglePose}
                    onShowAllTracks={onShowAllTracks}
                    onHideAllTracks={onHideAllTracks}
                    onToggleTrajectoryTrack={onToggleTrajectoryTrack}
                    onRemoveMetadata={onRemoveMetadata}
                    velocityColorPreset={velocityColorPreset}
                />}
            </div>
        </div>
    );
}
