'use client';

import { useRef } from 'react';
import type { RefObject } from 'react';
import { TrajectoryOverlay } from './TrajectoryOverlay';
import type { TrajectoryMetadata } from '../lib/trajectory-types';
import { useIKDrag } from '../hooks/useIKDrag';

interface OverlayComparisonStageProps {
    videoRef1: RefObject<HTMLVideoElement | null>;
    videoRef2: RefObject<HTMLVideoElement | null>;
    metadata1: TrajectoryMetadata | null;
    metadata2: TrajectoryMetadata | null;
    canRender1: boolean;
    canRender2: boolean;
    visibleTrajectoryTrackNames: string[];
    historyWindowSec: number | null;
    showPose: boolean;
}

const SOURCE_LEGEND = [
    {
        label: 'Video 1 pose',
        accentClassName: 'bg-blue-500',
        textClassName: 'text-blue-100',
        fill: 'rgba(59, 130, 246, 0.95)',
    },
    {
        label: 'Video 2 pose',
        accentClassName: 'bg-emerald-500',
        textClassName: 'text-emerald-100',
        fill: 'rgba(16, 185, 129, 0.95)',
    },
] as const;

export function OverlayComparisonStage({
    videoRef1,
    videoRef2,
    metadata1,
    metadata2,
    canRender1,
    canRender2,
    visibleTrajectoryTrackNames,
    historyWindowSec,
    showPose,
}: OverlayComparisonStageProps) {
    const stageRef = useRef<HTMLDivElement>(null);
    const hasRenderableOverlay = (metadata1 && canRender1) || (metadata2 && canRender2);

    const {
        overrides,
        cursor,
        hasOverrides,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerLeave,
        resetIK,
    } = useIKDrag(
        [
            { metadata: metadata1, videoRef: videoRef1, canRender: canRender1 },
            { metadata: metadata2, videoRef: videoRef2, canRender: canRender2 },
        ],
        showPose,
    );



    return (
        <div className="relative h-full overflow-hidden rounded-lg border-4 border-gray-300 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_40%),linear-gradient(180deg,_#020617_0%,_#111827_100%)] dark:border-gray-700">
            <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between border-b border-white/10 bg-black/35 px-5 py-4 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-2">
                    {SOURCE_LEGEND.map((source) => (
                        <div
                            key={source.label}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5"
                        >
                            <span className={`h-2.5 w-2.5 rounded-full ${source.accentClassName}`} />
                            <span className={`text-xs font-medium ${source.textClassName}`}>{source.label}</span>
                        </div>
                    ))}
                </div>

                {showPose && hasOverrides && (
                    <button
                        type="button"
                        onClick={resetIK}
                        className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                    >
                        Reset pose
                    </button>
                )}
            </div>

            <div className="relative h-full w-full pt-20">
                <div className="absolute inset-0" />

                <div
                    ref={stageRef}
                    className="relative h-full w-full"
                    style={{ cursor, touchAction: 'none' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerLeave}
                >
                    <TrajectoryOverlay
                        containerRef={stageRef}
                        videoRef={videoRef1}
                        metadata={metadata1}
                        enabled={Boolean(metadata1 && canRender1)}
                        showBlackBackground={false}
                        historyWindowSec={historyWindowSec}
                        visibleTrackNames={visibleTrajectoryTrackNames}
                        showPose={showPose}
                        poseColor={{ r: 59, g: 130, b: 246 }}
                        landmarkOverrides={overrides[0]}
                        className="absolute inset-0"
                    />
                    <TrajectoryOverlay
                        containerRef={stageRef}
                        videoRef={videoRef2}
                        metadata={metadata2}
                        enabled={Boolean(metadata2 && canRender2)}
                        showBlackBackground={false}
                        historyWindowSec={historyWindowSec}
                        visibleTrackNames={visibleTrajectoryTrackNames}
                        showPose={showPose}
                        poseColor={{ r: 16, g: 185, b: 129 }}
                        landmarkOverrides={overrides[1]}
                        className="absolute inset-0"
                    />
                </div>

                {!hasRenderableOverlay && (
                    <div className="absolute inset-0 flex items-center justify-center px-8">
                        <div className="max-w-md rounded-2xl border border-dashed border-white/15 bg-black/35 px-6 py-5 text-center backdrop-blur-sm">
                            <p className="text-sm font-semibold text-white">
                                Overlay view is ready once compatible metadata is loaded.
                            </p>
                            <p className="mt-2 text-sm text-slate-300">
                                Use Split View to upload videos and metadata, then switch back here to compare the pose layers on a shared canvas.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}