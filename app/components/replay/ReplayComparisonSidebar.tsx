'use client';

import { OverlaySettingsPanel } from '../OverlaySettingsPanel';
import { VideoControlPanel } from '../VideoControlPanel';
import { AnnotationPanel } from '../AnnotationPanel';
import { OnboardingContent } from './OnboardingContent';
import type { KeyMoment } from '../../lib/key-moments';
import type { Annotation, AnnotationLabelGroup } from '../../lib/annotations';
import type { VelocityColorPreset } from '../../lib/trajectory-types';

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
    // Annotations
    annotations: Annotation[];
    selectedAnnotationId: string | null;
    onSelectAnnotation: (id: string) => void;
    onDeselectAnnotation: () => void;
    onCreateAnnotation1: () => void;
    onCreateAnnotation2: () => void;
    onDeleteAnnotation: (id: string) => void;
    onUpdateAnnotationRange: (id: string, startTime: number, endTime: number) => void;
    onToggleAnnotationLabel: (id: string, group: AnnotationLabelGroup, label: string) => void;
    onSetAnnotationNotes: (id: string, notes: string) => void;
    onSeekVideo: (videoIndex: 0 | 1, time: number) => void;
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
    annotations,
    selectedAnnotationId,
    onSelectAnnotation,
    onDeselectAnnotation,
    onCreateAnnotation1,
    onCreateAnnotation2,
    onDeleteAnnotation,
    onUpdateAnnotationRange,
    onToggleAnnotationLabel,
    onSetAnnotationNotes,
    onSeekVideo,
}: ReplayComparisonSidebarProps) {
    return (
        <div className="w-md shrink-0 h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 border-l border-gray-200 dark:border-gray-700">
            <div className="flex flex-col">
                {!hasVideos && <OnboardingContent />}

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

                <AnnotationPanel
                    hasVideo1={hasVideo1}
                    hasVideo2={hasVideo2}
                    duration1={duration1}
                    duration2={duration2}
                    fps1={fps1}
                    fps2={fps2}
                    annotations={annotations}
                    selectedAnnotationId={selectedAnnotationId}
                    onSelectAnnotation={onSelectAnnotation}
                    onDeselectAnnotation={onDeselectAnnotation}
                    onCreateAnnotation1={onCreateAnnotation1}
                    onCreateAnnotation2={onCreateAnnotation2}
                    onDeleteAnnotation={onDeleteAnnotation}
                    onUpdateAnnotationRange={onUpdateAnnotationRange}
                    onToggleAnnotationLabel={onToggleAnnotationLabel}
                    onSetAnnotationNotes={onSetAnnotationNotes}
                    onSeekVideo={onSeekVideo}
                />

                {hasAnyOverlayData && (
                    <OverlaySettingsPanel
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
                    />
                )}
            </div>
        </div>
    );
}
