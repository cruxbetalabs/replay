'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CloudUpload, FileJson2, FileVideo } from 'lucide-react';
import { TrajectoryOverlay } from './TrajectoryOverlay';
import { StageToast, type ProcessResult } from './StageToast';
import { StageReplaceConfirm } from './StageReplaceConfirm';
import type { TrajectoryMetadata, VideoDimensions } from '../lib/trajectory-types';
import { useIKDrag } from '../hooks/useIKDrag';

// ─── Utilities ───────────────────────────────────────────────────────────────

const isSupportedVideo = (file: File): boolean =>
    file.type === 'video/mp4' ||
    file.type === 'video/quicktime' ||
    /\.(mp4|mov)$/i.test(file.name);

const isSupportedJson = (file: File): boolean =>
    file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');

async function probeVideoFile(file: File): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);

        const cleanup = () => {
            URL.revokeObjectURL(url);
            video.src = '';
        };

        const timeout = setTimeout(() => {
            cleanup();
            resolve({ ok: false, error: 'Video took too long to load.' });
        }, 15_000);

        video.onloadedmetadata = () => {
            clearTimeout(timeout);
            cleanup();
            resolve({ ok: true });
        };

        video.onerror = () => {
            clearTimeout(timeout);
            cleanup();
            resolve({
                ok: false,
                error: 'Cannot read video. The format may not be supported or the file is corrupted.',
            });
        };

        video.preload = 'metadata';
        video.src = url;
    });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FormatChip({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}) {
    const baseClass =
        'flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm';

    if (onClick) {
        return (
            <button
                type="button"
                className={`${baseClass} cursor-pointer transition-colors hover:border-gray-300 hover:bg-gray-50`}
                onClick={onClick}
            >
                {icon}
                {label}
            </button>
        );
    }

    return (
        <span className={baseClass}>
            {icon}
            {label}
        </span>
    );
}

// ─── Props ───────────────────────────────────────────────────────────────────

type VideoDropzoneProps = {
    label: string;
    videoUrl: string | null;
    /** Called when a video file is accepted and ready to be applied. */
    onVideoFileDrop: (file: File) => void;
    /** Called when a JSON file is accepted. Returns parse/integrity result. */
    onJsonFileDrop: (file: File) => Promise<{ error?: string; warnings?: string[] }>;
    className?: string;
    isCalculating?: boolean;
    trajectoryMetadata?: TrajectoryMetadata | null;
    trajectoryFileName?: string | null;
    canRenderTrajectory?: boolean;
    trajectoryHistoryWindowSec?: number | null;
    visibleTrajectoryTrackNames?: string[];
    showPose?: boolean;
    onRemoveTrajectory?: () => void;
    onVideoMetadataLoad?: (metadata: VideoDimensions) => void;
    resetIKRef?: React.MutableRefObject<(() => void) | null>;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const VideoDropzone = React.forwardRef<HTMLVideoElement, VideoDropzoneProps>(
    function VideoDropzone(
        {
            label,
            videoUrl,
            onVideoFileDrop,
            onJsonFileDrop,
            className,
            isCalculating = false,
            trajectoryMetadata = null,
            trajectoryFileName = null,
            canRenderTrajectory = true,
            trajectoryHistoryWindowSec = null,
            visibleTrajectoryTrackNames = [],
            showPose = true,
            onRemoveTrajectory: _onRemoveTrajectory,
            onVideoMetadataLoad,
            resetIKRef,
        }: VideoDropzoneProps,
        ref,
    ) {
        const fallbackVideoRef = useRef<HTMLVideoElement>(null);
        const videoInputRef = useRef<HTMLInputElement>(null);
        const jsonInputRef = useRef<HTMLInputElement>(null);
        const stageRef = useRef<HTMLDivElement>(null);
        const videoInputId = useId();
        const resolvedVideoRef =
            typeof ref === 'function' || ref == null ? fallbackVideoRef : ref;

        const hasTrajectory = !!trajectoryMetadata;
        const hasRenderableTrajectory = hasTrajectory && canRenderTrajectory;
        const showTrajectoryBackground = hasTrajectory && !videoUrl;

        const [maskOpacity, setMaskOpacity] = useState(0.10);

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
            [{ metadata: trajectoryMetadata, videoRef: resolvedVideoRef, canRender: canRenderTrajectory }],
            showPose,
        );

        useEffect(() => {
            if (!resetIKRef) return;
            resetIKRef.current = resetIK;
            return () => { resetIKRef.current = null; };
        }, [resetIK, resetIKRef]);

        // ── Drop processing state ────────────────────────────────────────────
        const [isDraggingOver, setIsDraggingOver] = useState(false);
        const [isProcessing, setIsProcessing] = useState(false);
        const [replaceConfirm, setReplaceConfirm] = useState<{
            file: File;
            kind: 'video' | 'json';
            resolve: (confirmed: boolean) => void;
        } | null>(null);
        const [toast, setToast] = useState<ProcessResult[] | null>(null);

        const dragCounterRef = useRef(0);

        // Refs so processFiles always reads the latest prop values across awaits
        const videoUrlRef = useRef(videoUrl);
        videoUrlRef.current = videoUrl;
        const trajectoryFileNameRef = useRef(trajectoryFileName);
        trajectoryFileNameRef.current = trajectoryFileName;

        // ── Replace confirm prompt ───────────────────────────────────────────
        const promptReplaceConfirm = useCallback(
            (file: File, kind: 'video' | 'json'): Promise<boolean> =>
                new Promise((resolve) => setReplaceConfirm({ file, kind, resolve })),
            [],
        );

        // ── File processing pipeline ─────────────────────────────────────────
        const processFiles = useCallback(
            async (files: File[]) => {
                setIsProcessing(true);
                const results: ProcessResult[] = [];

                const videoFiles = files.filter(isSupportedVideo);
                const jsonFiles = files.filter(isSupportedJson);
                const unsupported = files.filter(
                    (f) => !isSupportedVideo(f) && !isSupportedJson(f),
                );

                for (const file of unsupported) {
                    results.push({
                        fileName: file.name,
                        kind: 'unknown',
                        status: 'error',
                        message: 'Unsupported format. Only MP4, MOV, and JSON are accepted.',
                    });
                }

                let appliedVideoInBatch = false;

                for (const file of videoFiles) {
                    const probe = await probeVideoFile(file);
                    if (!probe.ok) {
                        results.push({
                            fileName: file.name,
                            kind: 'video',
                            status: 'error',
                            message: probe.error,
                        });
                        continue;
                    }

                    if (videoUrlRef.current || appliedVideoInBatch) {
                        const confirmed = await promptReplaceConfirm(file, 'video');
                        if (!confirmed) {
                            results.push({
                                fileName: file.name,
                                kind: 'video',
                                status: 'cancelled',
                                message: 'Video not replaced.',
                            });
                            continue;
                        }
                    }

                    const wasReplacing = !!(videoUrlRef.current || appliedVideoInBatch);
                    onVideoFileDrop(file);
                    appliedVideoInBatch = true;
                    videoUrlRef.current = 'pending';

                    results.push({
                        fileName: file.name,
                        kind: 'video',
                        status: 'success',
                        message: wasReplacing ? 'Video replaced.' : 'Video loaded.',
                    });
                }

                let appliedJsonInBatch = false;

                for (const file of jsonFiles) {
                    if (trajectoryFileNameRef.current || appliedJsonInBatch) {
                        const confirmed = await promptReplaceConfirm(file, 'json');
                        if (!confirmed) {
                            results.push({
                                fileName: file.name,
                                kind: 'json',
                                status: 'cancelled',
                                message: 'Metadata not replaced.',
                            });
                            continue;
                        }
                    }

                    const wasReplacing = !!(trajectoryFileNameRef.current || appliedJsonInBatch);
                    const result = await onJsonFileDrop(file);
                    appliedJsonInBatch = true;
                    trajectoryFileNameRef.current = 'pending';

                    if (result.error) {
                        results.push({
                            fileName: file.name,
                            kind: 'json',
                            status: 'error',
                            message: result.error,
                        });
                    } else if (result.warnings?.length) {
                        results.push({
                            fileName: file.name,
                            kind: 'json',
                            status: 'warning',
                            message: result.warnings[0],
                        });
                    } else {
                        results.push({
                            fileName: file.name,
                            kind: 'json',
                            status: 'success',
                            message: wasReplacing ? 'Metadata replaced.' : 'Metadata loaded.',
                        });
                    }
                }

                setIsProcessing(false);
                if (results.length > 0) setToast(results);
            },
            [onJsonFileDrop, onVideoFileDrop, promptReplaceConfirm],
        );

        // ── Drag event handlers ──────────────────────────────────────────────
        const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            dragCounterRef.current++;
            setIsDraggingOver(true);
        }, []);

        const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            dragCounterRef.current--;
            if (dragCounterRef.current === 0) setIsDraggingOver(false);
        }, []);

        const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
        }, []);

        const handleDrop = useCallback(
            (e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                dragCounterRef.current = 0;
                setIsDraggingOver(false);
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) void processFiles(files);
            },
            [processFiles],
        );

        // ── Click-to-upload ──────────────────────────────────────────────────
        const handleVideoInputChange = useCallback(
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void processFiles([file]);
            },
            [processFiles],
        );

        const handleJsonInputChange = useCallback(
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void processFiles([file]);
            },
            [processFiles],
        );

        // ── Overlays rendered on top of both states ──────────────────────────
        function renderOverlays() {
            return (
                <>
                    {isDraggingOver && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-cyan-900/80 backdrop-blur-sm pointer-events-none">
                            <svg
                                className="h-10 w-10 text-white/70"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                            <p className="text-base font-semibold text-white">Drop to upload</p>
                            <p className="text-xs text-white/60">MP4 · MOV · JSON</p>
                        </div>
                    )}

                    {isProcessing && !replaceConfirm && (
                        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            <p className="text-xs font-medium text-white/80">Processing…</p>
                        </div>
                    )}

                    {replaceConfirm && (
                        <StageReplaceConfirm
                            fileName={replaceConfirm.file.name}
                            kind={replaceConfirm.kind}
                            onConfirm={() => {
                                replaceConfirm.resolve(true);
                                setReplaceConfirm(null);
                            }}
                            onCancel={() => {
                                replaceConfirm.resolve(false);
                                setReplaceConfirm(null);
                            }}
                        />
                    )}

                    {toast && !isProcessing && !replaceConfirm && (
                        <StageToast results={toast} onClose={() => setToast(null)} />
                    )}
                </>
            );
        }

        // ── Render ───────────────────────────────────────────────────────────
        return (
            <div
                className={`flex-1 h-full rounded-lg overflow-hidden bg-white flex items-center justify-center border-4 transition-colors ${isDraggingOver ? 'border-cyan-400' : 'border-gray-300'} ${className ?? ''}`.trim()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {!videoUrl ? (
                    // ── Empty state ──────────────────────────────────────────
                    <div ref={stageRef} className="relative flex h-full w-full flex-col">
                        {hasTrajectory ? (
                            <div className="relative flex-1 bg-black">
                                <TrajectoryOverlay
                                    containerRef={stageRef}
                                    videoRef={resolvedVideoRef}
                                    metadata={trajectoryMetadata}
                                    enabled={canRenderTrajectory}
                                    showBlackBackground
                                    historyWindowSec={trajectoryHistoryWindowSec}
                                    visibleTrackNames={visibleTrajectoryTrackNames}
                                    showPose={showPose}
                                />
                                <div className="absolute inset-x-4 top-4 rounded-md border border-white/15 bg-black/70 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                                        Trajectory Preview
                                    </p>
                                    <p className="mt-1 text-xs text-white/85">
                                        Black-background render until a video is loaded into {label}.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <label
                                htmlFor={videoInputId}
                                className={`flex flex-1 cursor-pointer flex-col items-center justify-center transition-colors ${isDraggingOver ? 'bg-cyan-50' : 'hover:bg-gray-50'}`}
                            >
                                <CloudUpload className="mb-3 h-12 w-12 text-gray-400" />
                                <p className="mb-1 text-base font-bold text-gray-500">{label}</p>
                                <p className="text-sm text-gray-400">
                                    Drop files here or click to upload a video
                                </p>
                            </label>
                        )}

                        {/* Format hints bar */}
                        <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Accepted formats
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                <FormatChip icon={<FileVideo className="h-3 w-3" />} label="MP4" />
                                <FormatChip icon={<FileVideo className="h-3 w-3" />} label="MOV" />
                                <FormatChip
                                    icon={<FileJson2 className="h-3 w-3" />}
                                    label="JSON (Metadata)"

                                />
                            </div>
                        </div>

                        {/* Hidden inputs */}
                        <input
                            id={videoInputId}
                            ref={videoInputRef}
                            type="file"
                            accept="video/mp4,video/quicktime,.mp4,.mov"
                            onChange={handleVideoInputChange}
                            className="hidden"
                        />
                        <input
                            ref={jsonInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleJsonInputChange}
                            className="hidden"
                        />

                        {renderOverlays()}
                    </div>
                ) : (
                    // ── Loaded state (video player) ──────────────────────────
                    <div
                        ref={stageRef}
                        className="relative flex h-full w-full items-center justify-center bg-black"
                        style={{ cursor, touchAction: 'none' }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerLeave={onPointerLeave}
                    >
                        {isCalculating && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                                    Calculating FPS…
                                </div>
                            </div>
                        )}

                        <video
                            ref={ref}
                            src={videoUrl}
                            className={`max-h-full max-w-full object-contain transition-opacity duration-150 ${isCalculating ? 'opacity-0' : 'opacity-100'}`}
                            style={{ pointerEvents: 'none' }}
                            controls={false}
                            autoPlay={false}
                            playsInline
                            preload="metadata"
                            aria-busy={isCalculating}
                            onLoadedData={() => {
                                console.debug('[VideoDropzone] Video loaded', { label, src: videoUrl });
                            }}
                            onError={(e) => {
                                const mediaError = e.currentTarget.error;
                                console.debug('[VideoDropzone] Video failed to load', {
                                    label,
                                    src: videoUrl,
                                    code: mediaError?.code ?? null,
                                    message: mediaError?.message ?? null,
                                });
                            }}
                            onLoadedMetadata={(e) => {
                                const video = e.currentTarget;
                                console.debug('[VideoDropzone] Video metadata loaded', {
                                    label,
                                    src: videoUrl,
                                    duration: video.duration,
                                    videoWidth: video.videoWidth,
                                    videoHeight: video.videoHeight,
                                });
                                onVideoMetadataLoad?.({
                                    width: video.videoWidth,
                                    height: video.videoHeight,
                                    durationSeconds: Number.isFinite(video.duration)
                                        ? video.duration
                                        : null,
                                });
                                if (!video.paused) video.pause();
                                video.currentTime = 0;
                            }}
                        />

                        {showPose && hasRenderableTrajectory && (
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{ backgroundColor: `rgba(0,0,0,${maskOpacity})` }}
                            />
                        )}

                        <TrajectoryOverlay
                            containerRef={stageRef}
                            videoRef={resolvedVideoRef}
                            metadata={trajectoryMetadata}
                            enabled={hasRenderableTrajectory}
                            showBlackBackground={showTrajectoryBackground}
                            historyWindowSec={trajectoryHistoryWindowSec}
                            visibleTrackNames={visibleTrajectoryTrackNames}
                            showPose={showPose}
                            landmarkOverrides={overrides[0]}
                        />

                        {showPose && hasRenderableTrajectory && (
                            <div className="absolute left-4 top-4 z-10 flex flex-col items-start gap-2">
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
                                {hasOverrides && (
                                    <button
                                        type="button"
                                        onClick={resetIK}
                                        className="cursor-pointer rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/80 shadow-lg backdrop-blur-sm transition-colors hover:bg-white/15 hover:text-white"
                                    >
                                        Reset pose
                                    </button>
                                )}
                            </div>
                        )}

                        {renderOverlays()}
                    </div>
                )}
            </div>
        );
    },
);


