'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type {
    PoseFrame,
    PoseLandmark,
    TrajectoryMetadata,
    TrajectorySample,
    TrajectoryVector2D,
    VelocityColorPreset,
} from '../lib/trajectory-types';

interface TrajectoryOverlayProps {
    containerRef: RefObject<HTMLDivElement | null>;
    videoRef: RefObject<HTMLVideoElement | null>;
    metadata: TrajectoryMetadata | null;
    enabled: boolean;
    showBlackBackground: boolean;
    historyWindowSec?: number | null;
    visibleTrackNames?: string[];
    showPose?: boolean;
    poseColor?: RgbColor;
    className?: string;
}

interface RgbColor {
    r: number;
    g: number;
    b: number;
}

const TRAJECTORY_ARROW_MIN_LENGTH_PX = 24;
const TRAJECTORY_ARROW_MAX_LENGTH_PX = 84;
const TRAJECTORY_ARROW_HEAD_MIN_LENGTH_PX = 8;
const TRAJECTORY_ARROW_HEAD_MAX_LENGTH_PX = 16;
const TRAJECTORY_ARROW_HEAD_SCALE = 0.3;
const TRAJECTORY_ARROW_STROKE_WIDTH_PX = 3;
const TRAJECTORY_ARROW_ORIGIN_RADIUS_PX = 4;
const POSE_VISIBILITY_THRESHOLD = 0.5;
const POSE_PRESENCE_THRESHOLD = 0.5;
const POSE_SKELETON_STROKE_WIDTH_PX = 2;
const POSE_LANDMARK_RADIUS_PX = 3;
const DEFAULT_POSE_COLOR: RgbColor = { r: 255, g: 255, b: 255 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const findLastSampleAtOrBefore = (samples: TrajectorySample[], currentTimeSec: number) => {
    let low = 0;
    let high = samples.length - 1;
    let bestIndex = -1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (samples[mid].timestampSeconds <= currentTimeSec) {
            bestIndex = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return bestIndex;
};

const findFirstSampleAtOrAfter = (samples: TrajectorySample[], targetTimeSec: number) => {
    let low = 0;
    let high = samples.length - 1;
    let bestIndex = samples.length;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (samples[mid].timestampSeconds >= targetTimeSec) {
            bestIndex = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    return bestIndex;
};

const findLastPoseFrameAtOrBefore = (frames: PoseFrame[], currentTimeSec: number) => {
    let low = 0;
    let high = frames.length - 1;
    let bestIndex = -1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (frames[mid].timestampSeconds <= currentTimeSec) {
            bestIndex = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return bestIndex;
};

const lerp = (start: number, end: number, amount: number) => start + ((end - start) * amount);
const getVectorMagnitude = (vector: TrajectoryVector2D | null) => {
    if (!vector) {
        return 0;
    }

    return Math.hypot(vector.dx, vector.dy);
};

const interpolateThreeStopPresetBgrToRgb = (preset: VelocityColorPreset, ratio: number): RgbColor => {
    const clampedRatio = clamp(ratio, 0, 1);
    const [first, second, segmentAmount] = clampedRatio <= 0.5
        ? [preset.slowBgr, preset.midBgr, clampedRatio / 0.5]
        : [preset.midBgr, preset.fastBgr, (clampedRatio - 0.5) / 0.5];

    const blue = Math.round(lerp(first[0], second[0], segmentAmount));
    const green = Math.round(lerp(first[1], second[1], segmentAmount));
    const red = Math.round(lerp(first[2], second[2], segmentAmount));

    return { r: red, g: green, b: blue };
};

const getContainedRect = (
    containerWidth: number,
    containerHeight: number,
    sourceWidth: number,
    sourceHeight: number,
) => {
    if (containerWidth <= 0 || containerHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    const containerAspect = containerWidth / containerHeight;
    const sourceAspect = sourceWidth / sourceHeight;

    if (sourceAspect > containerAspect) {
        const width = containerWidth;
        const height = width / sourceAspect;
        return {
            x: 0,
            y: (containerHeight - height) / 2,
            width,
            height,
        };
    }

    const height = containerHeight;
    const width = height * sourceAspect;
    return {
        x: (containerWidth - width) / 2,
        y: 0,
        width,
        height,
    };
};

const drawArrow = (
    context: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    deltaX: number,
    deltaY: number,
    color: RgbColor,
) => {
    const magnitude = Math.hypot(deltaX, deltaY);
    if (magnitude < 1) {
        return;
    }

    const endX = startX + deltaX;
    const endY = startY + deltaY;
    const angle = Math.atan2(deltaY, deltaX);
    const headLength = Math.max(
        TRAJECTORY_ARROW_HEAD_MIN_LENGTH_PX,
        Math.min(TRAJECTORY_ARROW_HEAD_MAX_LENGTH_PX, magnitude * TRAJECTORY_ARROW_HEAD_SCALE),
    );

    context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.lineWidth = TRAJECTORY_ARROW_STROKE_WIDTH_PX;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();

    context.beginPath();
    context.moveTo(endX, endY);
    context.lineTo(
        endX - (headLength * Math.cos(angle - Math.PI / 6)),
        endY - (headLength * Math.sin(angle - Math.PI / 6)),
    );
    context.lineTo(
        endX - (headLength * Math.cos(angle + Math.PI / 6)),
        endY - (headLength * Math.sin(angle + Math.PI / 6)),
    );
    context.closePath();
    context.fill();

    context.beginPath();
    context.arc(startX, startY, TRAJECTORY_ARROW_ORIGIN_RADIUS_PX, 0, Math.PI * 2);
    context.fill();
};

const shouldDrawPoseLandmark = (landmark: PoseLandmark | null): landmark is PoseLandmark => {
    if (!landmark) {
        return false;
    }

    if (landmark.visibility != null && landmark.visibility < POSE_VISIBILITY_THRESHOLD) {
        return false;
    }

    if (landmark.presence != null && landmark.presence < POSE_PRESENCE_THRESHOLD) {
        return false;
    }

    return true;
};

export function TrajectoryOverlay({
    containerRef,
    videoRef,
    metadata,
    enabled,
    showBlackBackground,
    historyWindowSec = null,
    visibleTrackNames = [],
    showPose = true,
    poseColor = DEFAULT_POSE_COLOR,
    className,
}: TrajectoryOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) {
            return undefined;
        }

        const context = canvas.getContext('2d');
        if (!context) {
            return undefined;
        }

        let frameId = 0;

        // Pre-compute max velocity magnitude per track once per metadata load.
        // Avoids an O(n) reduce across all samples on every rendered frame.
        const maxVelocityByTrack = new Map<string, number>();
        if (metadata) {
            for (const [trackName, track] of Object.entries(metadata.tracks)) {
                let max = 0;
                for (const sample of track.samples) {
                    const m = getVectorMagnitude(sample.velocityVector2DPerSecond);
                    if (m > max) max = m;
                }
                maxVelocityByTrack.set(trackName, max);
            }
        }

        const resizeCanvas = () => {
            const rect = container.getBoundingClientRect();
            const devicePixelRatio = window.devicePixelRatio || 1;
            const nextWidth = Math.max(1, Math.round(rect.width * devicePixelRatio));
            const nextHeight = Math.max(1, Math.round(rect.height * devicePixelRatio));

            if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
                canvas.width = nextWidth;
                canvas.height = nextHeight;
            }

            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
        };

        const renderFrame = () => {
            const rect = container.getBoundingClientRect();
            const cssWidth = rect.width;
            const cssHeight = rect.height;
            const devicePixelRatio = window.devicePixelRatio || 1;

            context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
            context.clearRect(0, 0, cssWidth, cssHeight);

            if (showBlackBackground) {
                context.fillStyle = '#000000';
                context.fillRect(0, 0, cssWidth, cssHeight);
            }

            if (!enabled || !metadata) {
                return;
            }

            const sourceWidth = metadata.sourceVideo.width;
            const sourceHeight = metadata.sourceVideo.height;
            const videoRect = getContainedRect(cssWidth, cssHeight, sourceWidth, sourceHeight);
            const scaleX = videoRect.width / sourceWidth;
            const scaleY = videoRect.height / sourceHeight;
            const visibleTracks = new Set(visibleTrackNames);
            const currentTimeSec = videoRef.current?.currentTime ?? (showBlackBackground ? Number.POSITIVE_INFINITY : 0);

            Object.entries(metadata.tracks).forEach(([trackName, track]) => {
                if (!visibleTracks.has(trackName)) {
                    return;
                }

                const presetName = track.velocityColorPreset ?? metadata.style.defaultVelocityColorPreset;
                const preset = metadata.style.velocityColorPresets[presetName]
                    ?? metadata.style.velocityColorPresets[metadata.style.defaultVelocityColorPreset];

                if (!preset || preset.colorSpace !== 'bgr') {
                    return;
                }

                const endIndex = findLastSampleAtOrBefore(track.samples, currentTimeSec);
                if (endIndex < 0) {
                    return;
                }

                const latestSample = track.samples[endIndex];
                const maxVelocityMagnitude = maxVelocityByTrack.get(trackName) ?? 0;

                const startIndex = historyWindowSec == null
                    ? 1
                    : Math.max(1, findFirstSampleAtOrAfter(track.samples, currentTimeSec - historyWindowSec));

                for (let index = startIndex; index <= endIndex; index += 1) {
                    const previousSample = track.samples[index - 1];
                    const currentSample = track.samples[index];

                    if (!previousSample.point || !currentSample.point) {
                        continue;
                    }

                    const color = interpolateThreeStopPresetBgrToRgb(preset, currentSample.velocityRatio ?? 0);
                    context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                    context.lineWidth = 4;
                    context.lineCap = 'round';
                    context.lineJoin = 'round';
                    context.beginPath();
                    context.moveTo(
                        videoRect.x + (previousSample.point.x * scaleX),
                        videoRect.y + (previousSample.point.y * scaleY),
                    );
                    context.lineTo(
                        videoRect.x + (currentSample.point.x * scaleX),
                        videoRect.y + (currentSample.point.y * scaleY),
                    );
                    context.stroke();
                }

                if (!latestSample.point || !latestSample.velocityVector2DPerSecond) {
                    return;
                }

                const latestColor = interpolateThreeStopPresetBgrToRgb(preset, latestSample.velocityRatio ?? 0);
                const latestVector = latestSample.velocityVector2DPerSecond;
                const latestMagnitude = getVectorMagnitude(latestVector);
                if (latestMagnitude <= 0) {
                    return;
                }

                const normalizedMagnitude = clamp(
                    maxVelocityMagnitude > 0 ? latestMagnitude / maxVelocityMagnitude : 0,
                    0,
                    1,
                );
                const arrowLengthPx = lerp(
                    TRAJECTORY_ARROW_MIN_LENGTH_PX,
                    TRAJECTORY_ARROW_MAX_LENGTH_PX,
                    normalizedMagnitude,
                );
                const scaledVectorX = latestVector.dx * scaleX;
                const scaledVectorY = latestVector.dy * scaleY;
                const screenMagnitude = Math.hypot(scaledVectorX, scaledVectorY);
                if (screenMagnitude <= 0) {
                    return;
                }

                drawArrow(
                    context,
                    videoRect.x + (latestSample.point.x * scaleX),
                    videoRect.y + (latestSample.point.y * scaleY),
                    (scaledVectorX / screenMagnitude) * arrowLengthPx,
                    (scaledVectorY / screenMagnitude) * arrowLengthPx,
                    latestColor,
                );
            });

            if (!showPose || !metadata.pose) {
                return;
            }

            const poseFrameIndex = findLastPoseFrameAtOrBefore(metadata.pose.frames, currentTimeSec);
            if (poseFrameIndex < 0) {
                return;
            }

            const poseFrame = metadata.pose.frames[poseFrameIndex];
            if (!poseFrame.landmarks || poseFrame.landmarks.length !== metadata.pose.landmarkCount) {
                return;
            }

            const poseScaleX = videoRect.width / metadata.pose.coordinateSpace.width;
            const poseScaleY = videoRect.height / metadata.pose.coordinateSpace.height;

            context.strokeStyle = `rgba(${poseColor.r}, ${poseColor.g}, ${poseColor.b}, 0.82)`;
            context.lineWidth = POSE_SKELETON_STROKE_WIDTH_PX;
            context.lineCap = 'round';
            context.lineJoin = 'round';

            metadata.pose.skeletonConnections.forEach(([startIndex, endIndex]) => {
                const startLandmark = poseFrame.landmarks?.[startIndex] ?? null;
                const endLandmark = poseFrame.landmarks?.[endIndex] ?? null;
                if (!shouldDrawPoseLandmark(startLandmark) || !shouldDrawPoseLandmark(endLandmark)) {
                    return;
                }

                context.beginPath();
                context.moveTo(
                    videoRect.x + (startLandmark.x * poseScaleX),
                    videoRect.y + (startLandmark.y * poseScaleY),
                );
                context.lineTo(
                    videoRect.x + (endLandmark.x * poseScaleX),
                    videoRect.y + (endLandmark.y * poseScaleY),
                );
                context.stroke();
            });

            context.fillStyle = `rgba(${poseColor.r}, ${poseColor.g}, ${poseColor.b}, 0.95)`;
            poseFrame.landmarks.forEach((landmark) => {
                if (!shouldDrawPoseLandmark(landmark)) {
                    return;
                }

                context.beginPath();
                context.arc(
                    videoRect.x + (landmark.x * poseScaleX),
                    videoRect.y + (landmark.y * poseScaleY),
                    POSE_LANDMARK_RADIUS_PX,
                    0,
                    Math.PI * 2,
                );
                context.fill();
            });
        };

        // Type helper for the requestVideoFrameCallback API (not yet in lib.dom.d.ts everywhere)
        type VideoWithRVFC = HTMLVideoElement & {
            requestVideoFrameCallback: (cb: () => void) => number;
            cancelVideoFrameCallback: (id: number) => void;
        };

        const video = videoRef.current;
        const supportsRVFC = video != null && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
        let rvcId = 0;

        const renderOnce = () => {
            resizeCanvas();
            renderFrame();
        };

        // When rVFC is supported, render exactly once per decoded video frame (perfectly
        // GPU-synced, zero wasted work while paused or between frames).
        const scheduleRVFC = () => {
            if (!video) return;
            rvcId = (video as VideoWithRVFC).requestVideoFrameCallback(() => {
                renderOnce();
                if (!video.paused) scheduleRVFC();
            });
        };

        // Fallback: plain rAF loop (only runs while playing — see handlePlay/handlePause).
        const fallbackLoop = () => {
            renderFrame();
            frameId = window.requestAnimationFrame(fallbackLoop);
        };

        const startLoop = () => {
            if (supportsRVFC) {
                scheduleRVFC();
            } else {
                window.cancelAnimationFrame(frameId);
                frameId = window.requestAnimationFrame(fallbackLoop);
            }
        };

        const stopLoop = () => {
            if (supportsRVFC) {
                (video as VideoWithRVFC).cancelVideoFrameCallback(rvcId);
            } else {
                window.cancelAnimationFrame(frameId);
            }
        };

        const handlePlay = () => startLoop();
        const handlePause = () => { stopLoop(); renderOnce(); };
        // Render once per completed seek (covers scrubbing while paused).
        const handleSeeked = () => { renderOnce(); };

        const resizeObserver = new ResizeObserver(() => { renderOnce(); });

        if (video) {
            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
            video.addEventListener('seeked', handleSeeked);
        }

        resizeObserver.observe(container);
        resizeCanvas();
        renderOnce();

        // If the video is already playing when this effect runs, kick off the loop.
        if (video && !video.paused) {
            startLoop();
        }

        return () => {
            if (video) {
                video.removeEventListener('play', handlePlay);
                video.removeEventListener('pause', handlePause);
                video.removeEventListener('seeked', handleSeeked);
                stopLoop();
            }
            window.cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
        };
    }, [containerRef, enabled, historyWindowSec, metadata, poseColor.b, poseColor.g, poseColor.r, showBlackBackground, showPose, videoRef, visibleTrackNames]);

    return <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full pointer-events-none ${className ?? ''}`.trim()} />;
}