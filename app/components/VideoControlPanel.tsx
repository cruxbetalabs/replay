'use client';

import { RotateCcwIcon, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
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
    onRemoveMetadata?: () => void;
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
    onJumpToKeyMoment,
    onSelectKeyMoment,
    onDeselectKeyMoment,
    onSetKeyMomentTime1,
    onSetKeyMomentTime2,
    onUpdateKeyMomentFromVideo1,
    onUpdateKeyMomentFromVideo2,
    onDeleteKeyMoment,
    showRemoveVideos = true,
    onRemoveVideo1,
    onRemoveVideo2,
    onRemoveMetadata,
}: VideoControlPanelProps) {
    if (!hasVideos) return null;

    const selectedKeyMoment = selectedKeyMomentId
        ? keyMoments.find((keyMoment) => keyMoment.id === selectedKeyMomentId) ?? null
        : null;
    const selectedPosition1 = selectedKeyMoment?.positions[0] ?? null;
    const selectedPosition2 = selectedKeyMoment?.positions[1] ?? null;

    return (
        <SidebarPanel
            title="Video Controls"
            action={
                showRemoveVideos && (onRemoveVideo1 || onRemoveVideo2) ? (
                    <button
                        type="button"
                        onClick={() => {
                            if (hasVideo1) onRemoveVideo1?.();
                            if (hasVideo2) onRemoveVideo2?.();
                            onRemoveMetadata?.();
                        }}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        aria-label="Remove videos"
                    >
                        <RotateCcwIcon className="h-4 w-4" />
                    </button>
                ) : undefined
            }
        >
            <div className="flex items-center justify-between mb-3">
                <ButtonGroup>
                    {hasVideo1 && (
                        <Button type="button" variant="outline" size="sm" onClick={onCreateKeyMomentFromVideo1}>
                            <Plus />
                            Video 1
                        </Button>
                    )}
                    {hasVideo2 && (
                        <Button type="button" variant="outline" size="sm" onClick={onCreateKeyMomentFromVideo2}>
                            <Plus />
                            Video 2
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-500 disabled:opacity-30"
                        disabled={!selectedKeyMoment}
                        onClick={() => selectedKeyMoment && onDeleteKeyMoment(selectedKeyMoment.id)}
                    >
                        <Trash2 />
                    </Button>
                </ButtonGroup>
            </div>
            <div className="space-y-4">
                {hasVideo1 && (
                    <VideoPlaybackSection
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
                )}
                {hasVideo2 && (
                    <VideoPlaybackSection
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
                )}
            </div>
        </SidebarPanel>
    );
}