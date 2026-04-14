'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VideoIndex, VideoSourceIdentity } from '../lib/key-moments';

interface UseVideoSourcesOptions {
    onVideoChange?: (videoIndex: VideoIndex) => void;
}

const revokeObjectUrl = (url: string | null) => {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
};

export function useVideoSources({ onVideoChange }: UseVideoSourcesOptions = {}) {
    const [videoUrls, setVideoUrls] = useState<[string | null, string | null]>([null, null]);
    const [videoSources, setVideoSources] = useState<[VideoSourceIdentity | null, VideoSourceIdentity | null]>([null, null]);
    const videoRef1 = useRef<HTMLVideoElement>(null);
    const videoRef2 = useRef<HTMLVideoElement>(null);
    const videoUrlsRef = useRef(videoUrls);

    const videoRefs = useMemo<[typeof videoRef1, typeof videoRef2]>(() => [videoRef1, videoRef2], []);

    useEffect(() => {
        videoUrlsRef.current = videoUrls;
    }, [videoUrls]);

    useEffect(() => {
        return () => {
            revokeObjectUrl(videoUrlsRef.current[0]);
            revokeObjectUrl(videoUrlsRef.current[1]);
        };
    }, []);

    const replaceVideoUrl = useCallback((videoIndex: VideoIndex, nextUrl: string) => {
        setVideoUrls((prev) => {
            const nextVideoUrls: [string | null, string | null] = [...prev] as [string | null, string | null];
            revokeObjectUrl(nextVideoUrls[videoIndex]);
            nextVideoUrls[videoIndex] = nextUrl;
            return nextVideoUrls;
        });

        onVideoChange?.(videoIndex);
    }, [onVideoChange]);

    const replaceVideoSource = useCallback((videoIndex: VideoIndex, file: File, nextUrl?: string) => {
        setVideoSources((prev) => {
            const nextVideoSources: [VideoSourceIdentity | null, VideoSourceIdentity | null] = [...prev] as [VideoSourceIdentity | null, VideoSourceIdentity | null];
            nextVideoSources[videoIndex] = {
                fileName: file.name,
                fileSize: file.size,
                lastModified: file.lastModified,
                mimeType: file.type,
            };
            return nextVideoSources;
        });

        replaceVideoUrl(videoIndex, nextUrl ?? URL.createObjectURL(file));
    }, [replaceVideoUrl]);

    const removeVideo = useCallback((videoIndex: VideoIndex) => {
        setVideoUrls((prev) => {
            const nextVideoUrls: [string | null, string | null] = [...prev] as [string | null, string | null];
            revokeObjectUrl(nextVideoUrls[videoIndex]);
            nextVideoUrls[videoIndex] = null;
            return nextVideoUrls;
        });

        setVideoSources((prev) => {
            const nextVideoSources: [VideoSourceIdentity | null, VideoSourceIdentity | null] = [...prev] as [VideoSourceIdentity | null, VideoSourceIdentity | null];
            nextVideoSources[videoIndex] = null;
            return nextVideoSources;
        });

        onVideoChange?.(videoIndex);
    }, [onVideoChange]);

    const handleFileUpload = useCallback((videoIndex: VideoIndex, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (file && file.type.startsWith('video/')) {
            replaceVideoSource(videoIndex, file);
        }
    }, [replaceVideoSource]);

    return {
        videoUrl1: videoUrls[0],
        videoUrl2: videoUrls[1],
        videoUrls,
        videoSources,
        videoRef1,
        videoRef2,
        videoRefs,
        replaceVideoUrl,
        replaceVideoSource,
        removeVideo,
        handleFileUpload,
    };
}