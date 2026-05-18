'use client';

import type { RefObject } from 'react';
import { useRef, useState } from 'react';
import { TrajectoryOverlay } from '../TrajectoryOverlay';
import type { TrajectoryMetadata, VideoDimensions } from '../../lib/trajectory-types';
import { useIKDrag } from '../../hooks/useIKDrag';

interface ReplayBoundVideoStageProps {
    label: string;
    accentClassName?: string;
    videoUrl: string | null;
    videoRef: RefObject<HTMLVideoElement | null>;
    isCalculating?: boolean;
    trajectoryMetadata?: TrajectoryMetadata | null;
    trajectoryFileName?: string | null;
    trajectoryError?: string | null;
    trajectoryWarnings?: string[];
    canRenderTrajectory?: boolean;
    trajectoryHistoryWindowSec?: number | null;
    visibleTrajectoryTrackNames?: string[];
    showPose?: boolean;
    onVideoMetadataLoad?: (metadata: VideoDimensions) => void;
}

export function ReplayBoundVideoStage({
    label,
    accentClassName = 'bg-blue-500',
    videoUrl,
    videoRef,
    isCalculating = false,
    trajectoryMetadata = null,
    trajectoryFileName = null,
    trajectoryError = null,
    trajectoryWarnings = [],
    canRenderTrajectory = true,
    trajectoryHistoryWindowSec = null,
    visibleTrajectoryTrackNames = [],
    showPose = true,
    onVideoMetadataLoad,
}: ReplayBoundVideoStageProps) {
    const stageRef = useRef<HTMLDivElement>(null);
    const [maskOpacity, setMaskOpacity] = useState(0.10);
    const hasTrajectory = Boolean(trajectoryMetadata);
    const hasRenderableTrajectory = hasTrajectory && canRenderTrajectory;
    const showTrajectoryBackground = hasTrajectory && !videoUrl;
    const statusText = trajectoryError ?? trajectoryWarnings[0] ?? trajectoryFileName ?? 'Host-provided source';

    const {
        overrides,
        cursor,
        hasOverrides,
        pinnedJoints,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerLeave,
        onDoubleClick,
        resetIK,
    } = useIKDrag(
        [{ metadata: trajectoryMetadata, videoRef, canRender: canRenderTrajectory }],
        showPose,
    );

    return (
        <div className="flex-1 h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div
                ref={stageRef}
                className="relative flex h-full w-full items-center justify-center bg-black"
                style={{ cursor, touchAction: 'none' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerLeave}
                onDoubleClick={onDoubleClick}
            >
                {videoUrl ? (
                    <>
                        {isCalculating && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90">
                                <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                    Calculating FPS…
                                </div>
                            </div>
                        )}
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className={`max-w-full max-h-full object-contain transition-opacity duration-150 ${isCalculating ? 'opacity-0' : 'opacity-100'}`}
                            style={{ pointerEvents: 'none' }}
                            controls={false}
                            autoPlay={false}
                            playsInline
                            preload="metadata"
                            aria-busy={isCalculating}
                            onLoadedMetadata={(event) => {
                                const video = event.currentTarget;
                                onVideoMetadataLoad?.({
                                    width: video.videoWidth,
                                    height: video.videoHeight,
                                    durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
                                });
                                if (!video.paused) {
                                    video.pause();
                                }
                                video.currentTime = 0;
                            }}
                        />
                    </>
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_40%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-8 text-center">
                        <div className="max-w-sm rounded-2xl border border-dashed border-white/15 bg-black/35 px-6 py-5 text-white/85 backdrop-blur-sm">
                            <p className="text-sm font-semibold text-white">{label}</p>
                            <p className="mt-2 text-sm text-slate-300">
                                {hasTrajectory
                                    ? 'Trajectory data is available, but no video source is attached for this slot.'
                                    : 'No host-provided video or metadata is attached for this slot.'}
                            </p>
                        </div>
                    </div>
                )}

                {showPose && hasRenderableTrajectory && (
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{ backgroundColor: `rgba(0,0,0,${maskOpacity})` }}
                    />
                )}

                <TrajectoryOverlay
                    containerRef={stageRef}
                    videoRef={videoRef}
                    metadata={trajectoryMetadata}
                    enabled={hasRenderableTrajectory}
                    showBlackBackground={showTrajectoryBackground}
                    historyWindowSec={trajectoryHistoryWindowSec}
                    visibleTrackNames={visibleTrajectoryTrackNames}
                    showPose={showPose}
                    landmarkOverrides={overrides[0]}
                    pinnedJoints={pinnedJoints[0]}
                />

                <div className="absolute left-4 top-4 z-10 flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                        <div className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-lg backdrop-blur-sm">
                            {label}
                        </div>
                        {showPose && hasOverrides && (
                            <button
                                type="button"
                                onClick={resetIK}
                                className="cursor-pointer rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/80 shadow-lg backdrop-blur-sm transition-colors hover:bg-white/15 hover:text-white"
                            >
                                Reset pose
                            </button>
                        )}
                    </div>
                    {showPose && hasRenderableTrajectory && (
                        <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 shadow-lg backdrop-blur-sm">
                            <span className="whitespace-nowrap text-xs font-medium text-white/70">Overlay mask</span>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={Math.round(maskOpacity * 100)}
                                onChange={(e) => setMaskOpacity(Number(e.target.value) / 100)}
                                className="w-20 cursor-pointer"
                                style={{ accentColor: 'rgba(255,255,255,0.75)' }}
                            />
                        </div>
                    )}
                </div>

                <div className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 backdrop-blur-md">
                    <span className={`h-2.5 w-2.5 rounded-full ${accentClassName}`} />
                    <span className="text-xs font-medium text-white/85">{label}</span>
                </div>

                {(trajectoryFileName || trajectoryError || trajectoryWarnings.length > 0) && (
                    <div className="absolute bottom-4 left-4 right-4 max-w-sm rounded-2xl border border-white/15 bg-black/65 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Metadata</p>
                        <p className={`mt-1 text-sm ${trajectoryError ? 'text-red-200' : trajectoryWarnings.length > 0 ? 'text-amber-200' : 'text-white/85'}`}>
                            {statusText}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}