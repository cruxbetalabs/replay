'use client';

import { Separator } from '@/components/ui/separator';
import { VideoPlaybackSection } from './VideoPlaybackSection';
import { SidebarPanel } from './SidebarPanel';
import type { KeyMoment } from '../lib/key-moments';

interface VideoControlPanelProps {
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
    onSelectKeyMoment: (keyMomentId: string) => void;
    onDeselectKeyMoment: () => void;
    onSetKeyMomentTime1: (keyMomentId: string, time: number) => void;
    onSetKeyMomentTime2: (keyMomentId: string, time: number) => void;
    onDeleteKeyMoment: (keyMomentId: string) => void;
}

export function VideoControlPanel({
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
    onSelectKeyMoment,
    onDeselectKeyMoment,
    onSetKeyMomentTime1,
    onSetKeyMomentTime2,
    onDeleteKeyMoment,
}: VideoControlPanelProps) {
    if (!hasVideos) return null;

    const selectedKeyMoment = selectedKeyMomentId
        ? keyMoments.find((keyMoment) => keyMoment.id === selectedKeyMomentId) ?? null
        : null;
    const selectedPosition1 = selectedKeyMoment?.positions[0] ?? null;
    const selectedPosition2 = selectedKeyMoment?.positions[1] ?? null;

    return (
        <SidebarPanel title="Video Controls">
            {hasVideo1 && (
                <div className="space-y-3.5">
                    <VideoPlaybackSection
                        mode="playback"
                        label="Video 1"
                        videoIndex={0}
                        currentTime={currentTime1}
                        duration={duration1}
                        fps={fps1}
                        seekAmount={seekAmount1}
                        keyMoments={keyMoments}
                        selectedKeyMomentId={selectedKeyMomentId}
                        selectedPosition={selectedPosition1}
                        onSeek={onSeek1}
                        onActivateSlider={onPlaybackSliderActivate}
                        onSelectKeyMoment={onSelectKeyMoment}
                        onDeselectKeyMoment={onDeselectKeyMoment}
                        onChangeKeyMomentTime={onSetKeyMomentTime1}
                    />
                    <VideoPlaybackSection
                        mode="keyframes"
                        label="Video 1"
                        videoIndex={0}
                        currentTime={currentTime1}
                        duration={duration1}
                        fps={fps1}
                        seekAmount={seekAmount1}
                        keyMoments={keyMoments}
                        selectedKeyMomentId={selectedKeyMomentId}
                        selectedPosition={selectedPosition1}
                        onSeek={onSeek1}
                        onActivateSlider={onPlaybackSliderActivate}
                        onSelectKeyMoment={onSelectKeyMoment}
                        onDeselectKeyMoment={onDeselectKeyMoment}
                        onChangeKeyMomentTime={onSetKeyMomentTime1}
                        onCreateKeyMoment={onCreateKeyMomentFromVideo1}
                        onDeleteKeyMoment={onDeleteKeyMoment}
                    />
                </div>
            )}

            {hasVideo1 && hasVideo2 && <Separator className="my-4" />}

            {hasVideo2 && (
                <div className="space-y-3.5">
                    <VideoPlaybackSection
                        mode="playback"
                        label="Video 2"
                        videoIndex={1}
                        currentTime={currentTime2}
                        duration={duration2}
                        fps={fps2}
                        seekAmount={seekAmount2}
                        keyMoments={keyMoments}
                        selectedKeyMomentId={selectedKeyMomentId}
                        selectedPosition={selectedPosition2}
                        onSeek={onSeek2}
                        onActivateSlider={onPlaybackSliderActivate}
                        onSelectKeyMoment={onSelectKeyMoment}
                        onDeselectKeyMoment={onDeselectKeyMoment}
                        onChangeKeyMomentTime={onSetKeyMomentTime2}
                    />
                    <VideoPlaybackSection
                        mode="keyframes"
                        label="Video 2"
                        videoIndex={1}
                        currentTime={currentTime2}
                        duration={duration2}
                        fps={fps2}
                        seekAmount={seekAmount2}
                        keyMoments={keyMoments}
                        selectedKeyMomentId={selectedKeyMomentId}
                        selectedPosition={selectedPosition2}
                        onSeek={onSeek2}
                        onActivateSlider={onPlaybackSliderActivate}
                        onSelectKeyMoment={onSelectKeyMoment}
                        onDeselectKeyMoment={onDeselectKeyMoment}
                        onChangeKeyMomentTime={onSetKeyMomentTime2}
                        onCreateKeyMoment={onCreateKeyMomentFromVideo2}
                        onDeleteKeyMoment={onDeleteKeyMoment}
                    />
                </div>
            )}
        </SidebarPanel>
    );
}
