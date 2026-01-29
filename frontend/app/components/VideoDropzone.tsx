'use client';

import React, { useState } from 'react';

type VideoDropzoneProps = {
    label: string;
    videoUrl: string | null;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    isCalculating?: boolean;
    isUploading?: boolean;
};

export const VideoDropzone = React.forwardRef<HTMLVideoElement, VideoDropzoneProps>(function VideoDropzone(
    { label, videoUrl, onUpload, className, isCalculating = false, isUploading = false }: VideoDropzoneProps,
    ref,
) {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const videoFile = Array.from(files).find((file) => file.type.startsWith('video/'));
            if (videoFile && inputRef.current) {
                // Create a DataTransfer object to set the files on the input element
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(videoFile);
                inputRef.current.files = dataTransfer.files;

                // Trigger the onUpload handler
                const event = new Event('change', { bubbles: true });
                inputRef.current.dispatchEvent(event);
            }
        }
    };

    return (
        <div
            className={`flex-1 h-full border-4 ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-lg overflow-hidden bg-white flex items-center justify-center transition-colors ${className ?? ''}`.trim()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {!videoUrl ? (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
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
                    <p className="text-xs text-gray-500">Click to upload or drag and drop</p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="video/*"
                        onChange={onUpload}
                        className="hidden"
                    />
                </label>
            ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                    {isUploading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90">
                            <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                Uploading to server…
                            </div>
                        </div>
                    )}
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
                        className={`max-w-full max-h-full object-contain transition-opacity duration-150 ${isCalculating || isUploading ? 'opacity-0' : 'opacity-100'
                            }`}
                        controls={false}
                        autoPlay={false}
                        preload="metadata"
                        aria-busy={isCalculating || isUploading}
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
                            if (!video.paused) {
                                video.pause();
                            }
                            video.currentTime = 0;
                        }}
                    />
                </div>
            )}
        </div>
    );
});
