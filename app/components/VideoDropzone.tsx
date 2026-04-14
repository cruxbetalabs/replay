'use client';

import React, { useState } from 'react';
import { GitBranch, Video } from 'lucide-react';
import { TrajectoryOverlay } from './TrajectoryOverlay';
import type { TrajectoryMetadata, VideoDimensions } from '../lib/trajectory-types';

type DropTargetKind = 'video' | 'metadata';

type VideoDropzoneProps = {
    label: string;
    videoUrl: string | null;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    isCalculating?: boolean;
    trajectoryMetadata?: TrajectoryMetadata | null;
    trajectoryFileName?: string | null;
    trajectoryError?: string | null;
    trajectoryWarnings?: string[];
    canRenderTrajectory?: boolean;
    trajectoryHistoryWindowSec?: number | null;
    visibleTrajectoryTrackNames?: string[];
    showPose?: boolean;
    onTrajectoryUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveTrajectory?: () => void;
    onVideoMetadataLoad?: (metadata: VideoDimensions) => void;
};

const isJsonFile = (file: File) => file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');

const dispatchFileToInput = (input: HTMLInputElement | null, file: File) => {
    if (!input) {
        return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    const event = new Event('change', { bubbles: true });
    input.dispatchEvent(event);
};

function UploadKindIcon({ title, tone }: { title: string; tone: 'light' | 'overlay' }) {
    const iconClassName = tone === 'overlay' ? 'h-6 w-6 text-white/70' : 'h-6 w-6 text-gray-500';

    if (title === 'Video') {
        return <Video className={iconClassName} strokeWidth={1.8} aria-hidden="true" />;
    }

    return <GitBranch className={iconClassName} strokeWidth={1.8} aria-hidden="true" />;
}

function UploadDropCard({
    title,
    fileName,
    emptyLabel,
    error,
    warnings = [],
    uploadLabel,
    accept,
    inputRef,
    onUpload,
    onClear,
    tone = 'light',
    isActive = false,
    onDragOver,
    onDragLeave,
    onDrop,
}: {
    title: string;
    fileName: string | null;
    emptyLabel: string;
    error: string | null;
    warnings?: string[];
    uploadLabel: string;
    accept: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear?: () => void;
    tone?: 'light' | 'overlay';
    isActive?: boolean;
    onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
    onDragLeave?: (e: React.DragEvent<HTMLElement>) => void;
    onDrop?: (e: React.DragEvent<HTMLElement>) => void;
}) {
    const containerClassName = tone === 'overlay'
        ? `rounded-xl border p-3 text-white shadow-lg backdrop-blur-sm transition-colors ${isActive
            ? 'border-cyan-300 bg-cyan-950/70'
            : 'border-white/15 bg-black/72'
        }`
        : `rounded-xl border p-3 text-gray-900 shadow-sm transition-colors ${isActive
            ? 'border-cyan-400 bg-cyan-50'
            : 'border-gray-200 bg-white'
        }`;
    const fileClassName = tone === 'overlay'
        ? 'mt-2 text-xs font-medium text-white'
        : 'mt-2 text-xs font-medium text-gray-800';
    const buttonClassName = tone === 'overlay'
        ? 'rounded border border-white/20 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-white/10'
        : 'rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-100';
    const warningClassName = tone === 'overlay' ? 'mt-2 text-xs text-amber-200' : 'mt-2 text-xs text-amber-700';
    const errorClassName = tone === 'overlay' ? 'mt-2 text-xs font-medium text-red-300' : 'mt-2 text-xs font-medium text-red-600';

    return (
        <div
            className={containerClassName}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="shrink-0">
                    <UploadKindIcon title={title} tone={tone} />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <label className={buttonClassName}>
                        {uploadLabel}
                        <input
                            ref={inputRef}
                            type="file"
                            accept={accept}
                            onChange={onUpload}
                            className="hidden"
                        />
                    </label>
                    {fileName && onClear && (
                        <button
                            type="button"
                            onClick={onClear}
                            className={buttonClassName}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
            <p className={`${fileClassName} line-clamp-1`}>
                {fileName ?? emptyLabel}
            </p>
            {error && <p className={errorClassName}>{error}</p>}
            {!error && warnings.length > 0 && <p className={warningClassName}>{warnings[0]}</p>}
        </div>
    );
}

export const VideoDropzone = React.forwardRef<HTMLVideoElement, VideoDropzoneProps>(function VideoDropzone(
    {
        label,
        videoUrl,
        onUpload,
        className,
        isCalculating = false,
        trajectoryMetadata = null,
        trajectoryFileName = null,
        trajectoryError = null,
        trajectoryWarnings = [],
        canRenderTrajectory = true,
        trajectoryHistoryWindowSec = null,
        visibleTrajectoryTrackNames = [],
        showPose = true,
        onTrajectoryUpload,
        onRemoveTrajectory,
        onVideoMetadataLoad,
    }: VideoDropzoneProps,
    ref,
) {
    const [activeDropTarget, setActiveDropTarget] = useState<DropTargetKind | null>(null);
    const fallbackVideoRef = React.useRef<HTMLVideoElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const trajectoryInputRef = React.useRef<HTMLInputElement>(null);
    const stageRef = React.useRef<HTMLDivElement>(null);
    const videoInputId = React.useId();
    const resolvedVideoRef = typeof ref === 'function' || ref == null ? fallbackVideoRef : ref;
    const hasTrajectory = !!trajectoryMetadata;
    const hasRenderableTrajectory = hasTrajectory && canRenderTrajectory;
    const showTrajectoryBackground = hasTrajectory && !videoUrl;

    const createDragOverHandler = (target: DropTargetKind, matcher: (files: File[]) => File | undefined) => (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files ?? []);
        if (matcher(files)) {
            setActiveDropTarget(target);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const currentElement = e.currentTarget;
        const nextRelatedTarget = e.relatedTarget as Node | null;

        setActiveDropTarget((currentTarget) => {
            if (currentElement.contains(nextRelatedTarget)) {
                return currentTarget;
            }

            return null;
        });
    };

    const createDropHandler = (
        target: DropTargetKind,
        matcher: (files: File[]) => File | undefined,
        inputRef: React.RefObject<HTMLInputElement | null>,
    ) => (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveDropTarget((currentTarget) => (currentTarget === target ? null : currentTarget));

        const files = Array.from(e.dataTransfer.files ?? []);
        const matchedFile = matcher(files);
        if (matchedFile) {
            dispatchFileToInput(inputRef.current, matchedFile);
        }
    };

    const isVideoFile = (file: File) => file.type.startsWith('video/');
    const matchVideoFile = (files: File[]) => files.find(isVideoFile);
    const matchMetadataFile = (files: File[]) => files.find(
        (file) => isJsonFile(file) && /export[_-]?metadata|metadata|trajectory|track|pose|landmark/i.test(file.name),
    ) ?? files.find(isJsonFile);

    const handleVideoDragOver = createDragOverHandler('video', matchVideoFile);
    const handleTrajectoryDragOver = createDragOverHandler('metadata', matchMetadataFile);
    const handleVideoDrop = createDropHandler('video', matchVideoFile, inputRef);
    const handleTrajectoryDrop = createDropHandler('metadata', matchMetadataFile, trajectoryInputRef);

    return (
        <div className={`flex-1 h-full border-4 border-gray-300 rounded-lg overflow-hidden bg-white flex items-center justify-center transition-colors ${className ?? ''}`.trim()}>
            {!videoUrl ? (
                <div className="flex h-full w-full flex-col">
                    {hasTrajectory ? (
                        <div ref={stageRef} className="relative flex-1 bg-black">
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
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Trajectory Preview</p>
                                <p className="mt-1 text-xs text-white/85">Black-background render until a video is loaded into {label}.</p>
                            </div>
                        </div>
                    ) : (
                        <label
                            htmlFor={videoInputId}
                            className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-colors ${activeDropTarget === 'video' ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                            onDragOver={handleVideoDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleVideoDrop}
                        >
                            <svg className="w-12 h-12 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                            <p className="mb-2 text-sm text-gray-400">
                                <span className="font-semibold">{label}</span>
                            </p>
                            <p className="text-xs text-gray-500">Drop a video here or click to upload</p>
                        </label>
                    )}

                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                            <UploadDropCard
                                title="Video"
                                fileName={videoUrl ? `${label} loaded` : null}
                                emptyLabel="Attach the source video"
                                error={null}
                                warnings={[]}
                                uploadLabel="Upload"
                                accept="video/*"
                                inputRef={inputRef}
                                onUpload={onUpload}
                                tone="light"
                                isActive={activeDropTarget === 'video'}
                                onDragOver={handleVideoDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleVideoDrop}
                            />
                            <UploadDropCard
                                title="Metadata JSON"
                                fileName={trajectoryFileName}
                                emptyLabel="Attach export metadata"
                                error={trajectoryError}
                                warnings={trajectoryWarnings}
                                uploadLabel="Upload"
                                accept=".json,application/json"
                                inputRef={trajectoryInputRef}
                                onUpload={onTrajectoryUpload}
                                onClear={onRemoveTrajectory}
                                isActive={activeDropTarget === 'metadata'}
                                onDragOver={handleTrajectoryDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleTrajectoryDrop}
                            />
                        </div>
                    </div>
                    <input
                        id={videoInputId}
                        ref={inputRef}
                        type="file"
                        accept="video/*"
                        onChange={onUpload}
                        className="hidden"
                    />
                </div>
            ) : (
                <div
                    ref={stageRef}
                    className={`relative w-full h-full flex items-center justify-center bg-black transition-colors ${activeDropTarget === 'video' ? 'ring-2 ring-inset ring-cyan-300' : ''}`}
                    onDragOver={handleVideoDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleVideoDrop}
                >
                    {isCalculating && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90">
                            <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                Calculating FPS…
                            </div>
                        </div>
                    )}
                    <video
                        ref={ref}
                        src={videoUrl}
                        className={`max-w-full max-h-full object-contain transition-opacity duration-150 ${isCalculating ? 'opacity-0' : 'opacity-100'
                            }`}
                        controls={false}
                        autoPlay={false}
                        preload="metadata"
                        aria-busy={isCalculating}
                        onLoadedData={() => {
                            console.debug('[VideoDropzone] Video loaded', {
                                label,
                                src: videoUrl,
                            });
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
                                durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
                            });
                            if (!video.paused) {
                                video.pause();
                            }
                            video.currentTime = 0;
                        }}
                    />

                    <TrajectoryOverlay
                        containerRef={stageRef}
                        videoRef={resolvedVideoRef}
                        metadata={trajectoryMetadata}
                        enabled={hasRenderableTrajectory}
                        showBlackBackground={showTrajectoryBackground}
                        historyWindowSec={trajectoryHistoryWindowSec}
                        visibleTrackNames={visibleTrajectoryTrackNames}
                        showPose={showPose}
                    />
                    <div className="absolute bottom-3 left-3 right-3">
                        <div className="grid gap-2 md:max-w-[36rem] md:grid-cols-2">
                            <UploadDropCard
                                title="Video"
                                fileName={videoUrl ? `${label} loaded` : null}
                                emptyLabel="No video loaded"
                                error={null}
                                warnings={[]}
                                uploadLabel="Upload"
                                accept="video/*"
                                inputRef={inputRef}
                                onUpload={onUpload}
                                tone="overlay"
                                isActive={activeDropTarget === 'video'}
                                onDragOver={handleVideoDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleVideoDrop}
                            />
                            <UploadDropCard
                                title="Metadata JSON"
                                fileName={trajectoryFileName}
                                emptyLabel="No metadata JSON"
                                error={trajectoryError}
                                warnings={trajectoryWarnings}
                                uploadLabel="Upload"
                                accept=".json,application/json"
                                inputRef={trajectoryInputRef}
                                onUpload={onTrajectoryUpload}
                                onClear={onRemoveTrajectory}
                                tone="overlay"
                                isActive={activeDropTarget === 'metadata'}
                                onDragOver={handleTrajectoryDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleTrajectoryDrop}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
