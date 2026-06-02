'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { AnnotationToolbarPortal } from './AnnotationToolbarPortal';
import {
    DefaultColorStyle,
    DefaultSizeStyle,
    TextShapeUtil,
    type Editor,
    type TLComponents,
    type TLShape,
    type TLShapeId,
    Tldraw,
    useEditor,
} from 'tldraw';
import 'tldraw/tldraw.css';
import { Switch } from '@/components/ui/switch';
import { getContainedRect } from '../../lib/pose-ik';
import { isShapeRecordId, DEFAULT_ANNOTATION_COLOR, repairAnnotationShapeStyles } from '../../lib/annotation-shape-styles';
import {
    buildDefaultAnnotationTiming,
    clampAnnotationTiming,
    getAnnotationSizeForStageDimensions,
    getTldrawPersistenceKey,
    hasPlaybackTimeAdvanced,
    getReplayTimingFromMeta,
    normalizeShapeTimingsForDuration,
    REPLAY_TIMING_META_KEY,
    replayTimingMetaNeedsSync,
    resolveAnnotationShapeVisible,
    resolveShapeTiming,
    snapTimeToFrame,
    type AnnotationTiming,
} from '../../lib/video-annotations';
import type { VideoIndex } from '../../lib/key-moments';
import { AnnotationPlaybackSlider } from './AnnotationPlaybackSlider';
import styles from './VideoAnnotationLayer.module.css';

interface VideoAnnotationLayerProps {
    videoIndex: VideoIndex;
    videoRef: RefObject<HTMLVideoElement | null>;
    stageRef: RefObject<HTMLDivElement | null>;
    enabled: boolean;
    onToggleEnabled: () => void;
    currentTime: number;
    duration: number;
    fps: number | null;
    seekAmount: number;
    onSeek: (time: number) => void;
    shapeTimings: Record<string, AnnotationTiming>;
    onShapeTimingsChange: (shapeTimings: Record<string, AnnotationTiming>) => void;
    persistenceKey: string | null;
}

interface DrawRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

const ANNOTATION_COMPONENTS: TLComponents = {
    Background: () => null,
    Grid: null,
    NavigationPanel: null,
    Minimap: null,
    Toolbar: null,
    MenuPanel: null,
    PageMenu: null,
    HelpMenu: null,
    ActionsMenu: null,
    ContextMenu: null,
    StylePanel: null,
    RichTextToolbar: null,
    ImageToolbar: null,
    ZoomMenu: null,
    TopPanel: null,
};

const ANNOTATION_SHAPE_UTILS = [
    TextShapeUtil.configure({
        showTextOutline: true,
    }),
];

/** Locks tldraw page bounds to the on-screen video stage (CSS px), not source video pixels. */
function syncAnnotationViewport(
    editor: Editor,
    stageWidth: number,
    stageHeight: number,
) {
    editor.updateInstanceState({ isGridMode: false });

    editor.setCameraOptions({
        isLocked: true,
        wheelBehavior: 'none',
        panSpeed: 0,
        zoomSpeed: 0,
        constraints: {
            bounds: { x: 0, y: 0, w: stageWidth, h: stageHeight },
            padding: { x: 0, y: 0 },
            origin: { x: 0.5, y: 0.5 },
            initialZoom: 'fit-min',
            baseZoom: 'fit-min',
            behavior: { x: 'fixed', y: 'fixed' },
        },
    });

    editor.zoomToBounds(
        { x: 0, y: 0, w: stageWidth, h: stageHeight },
        { inset: 0, immediate: true, force: true },
    );
}

function configureAnnotationEditor(
    editor: Editor,
    stageWidth: number,
    stageHeight: number,
) {
    editor.user.updateUserPreferences({
        isDynamicSizeMode: false,
        colorScheme: 'light',
    });

    const size = getAnnotationSizeForStageDimensions(stageWidth, stageHeight);
    editor.setStyleForNextShapes(DefaultColorStyle, DEFAULT_ANNOTATION_COLOR);
    editor.setStyleForNextShapes(DefaultSizeStyle, size);
    editor.setStyleForSelectedShapes(DefaultColorStyle, DEFAULT_ANNOTATION_COLOR);
    editor.setStyleForSelectedShapes(DefaultSizeStyle, size);

    if (stageWidth > 0 && stageHeight > 0) {
        repairAnnotationShapeStyles(editor, stageWidth, stageHeight);
    }
}

function getPlaybackContext(
    videoRef: RefObject<HTMLVideoElement | null>,
    currentTimeRef: MutableRefObject<number>,
    durationRef: MutableRefObject<number>,
) {
    const video = videoRef.current;
    if (video && video.readyState >= 1) {
        return {
            currentTime: Number.isFinite(video.currentTime) ? video.currentTime : currentTimeRef.current,
            duration: Number.isFinite(video.duration) && video.duration > 0
                ? video.duration
                : durationRef.current,
        };
    }

    return {
        currentTime: currentTimeRef.current,
        duration: durationRef.current,
    };
}

function AnnotationSelectionSync({
    onSelectionChange,
}: {
    onSelectionChange: (selectedShapeIds: TLShapeId[]) => void;
}) {
    const editor = useEditor();

    useEffect(() => {
        const syncSelection = () => {
            onSelectionChange(editor.getSelectedShapeIds());
        };

        syncSelection();
        const cleanup = editor.store.listen(syncSelection, { scope: 'session' });
        return cleanup;
    }, [editor, onSelectionChange]);

    return null;
}

export function VideoAnnotationLayer({
    videoIndex,
    videoRef,
    stageRef,
    enabled,
    onToggleEnabled,
    currentTime,
    duration,
    fps,
    seekAmount,
    onSeek,
    shapeTimings,
    onShapeTimingsChange,
    persistenceKey,
}: VideoAnnotationLayerProps) {
    const editorRef = useRef<Editor | null>(null);
    const toolbarSlotRef = useRef<HTMLDivElement>(null);
    /** tldraw page size = displayed video stage (CSS px), not source file resolution. */
    const stageCanvasRef = useRef({ width: 0, height: 0 });
    const shapeTimingsRef = useRef(shapeTimings);
    const currentTimeRef = useRef(currentTime);
    const durationRef = useRef(duration);
    const fpsRef = useRef(fps);
    const enabledRef = useRef(enabled);
    const lastPlaybackTimeForSelectionRef = useRef<number | null>(null);
    const isRangeHandleDraggingRef = useRef(false);
    const [drawRect, setDrawRect] = useState<DrawRect>({ x: 0, y: 0, width: 0, height: 0 });
    const [videoSourceReady, setVideoSourceReady] = useState(false);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const hasRepairedTimingsRef = useRef(false);

    useEffect(() => {
        hasRepairedTimingsRef.current = false;
        setVideoSourceReady(false);
    }, [persistenceKey, videoIndex]);
    const [selectedShapeIds, setSelectedShapeIds] = useState<TLShapeId[]>([]);

    shapeTimingsRef.current = shapeTimings;
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
    fpsRef.current = fps;
    enabledRef.current = enabled;

    const tldrawPersistenceKey = getTldrawPersistenceKey(persistenceKey, videoIndex);
    const selectedShapeId = selectedShapeIds.length === 1 ? selectedShapeIds[0] : null;
    const selectedTiming = selectedShapeId ? shapeTimings[selectedShapeId] ?? null : null;
    const sliderMode = selectedTiming ? 'range' : 'scrub';

    const handleSelectionChange = useCallback((nextSelectedShapeIds: TLShapeId[]) => {
        setSelectedShapeIds(nextSelectedShapeIds);
    }, []);

    const handleRangeHandleDrag = useCallback((isDragging: boolean) => {
        isRangeHandleDraggingRef.current = isDragging;
    }, []);

    const handleRangeChange = useCallback((startTime: number, endTime: number) => {
        if (!selectedShapeId) {
            return;
        }

        const nextTiming = clampAnnotationTiming({ startTime, endTime }, duration, fps);
        const editor = editorRef.current;
        const selectedShape = editor?.getShape(selectedShapeId);
        if (editor && selectedShape) {
            editor.updateShapes([{
                id: selectedShapeId,
                type: selectedShape.type,
                meta: {
                    ...selectedShape.meta,
                    [REPLAY_TIMING_META_KEY]: {
                        startTime: nextTiming.startTime,
                        endTime: nextTiming.endTime,
                    },
                },
            }]);
        }

        onShapeTimingsChange({
            ...shapeTimings,
            [selectedShapeId]: nextTiming,
        });
    }, [duration, fps, onShapeTimingsChange, selectedShapeId, shapeTimings]);

    const updateDrawRect = useCallback(() => {
        const container = stageRef.current;
        const video = videoRef.current;
        if (!container || !video) {
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        if (!sourceWidth || !sourceHeight) {
            return;
        }

        const contained = getContainedRect(
            containerRect.width,
            containerRect.height,
            sourceWidth,
            sourceHeight,
        );
        if (contained.width <= 0 || contained.height <= 0) {
            return;
        }

        stageCanvasRef.current = { width: contained.width, height: contained.height };
        setVideoSourceReady(true);
        setDrawRect(contained);
    }, [stageRef, videoRef]);

    useEffect(() => {
        const editor = editorRef.current;
        const { width, height } = stageCanvasRef.current;
        if (!editor || !isEditorReady || width <= 0 || height <= 0 || drawRect.width <= 0) {
            return undefined;
        }

        const frameId = requestAnimationFrame(() => {
            syncAnnotationViewport(editor, width, height);
            configureAnnotationEditor(editor, width, height);
        });

        return () => cancelAnimationFrame(frameId);
    }, [drawRect, isEditorReady]);

    useEffect(() => {
        updateDrawRect();

        const container = stageRef.current;
        const video = videoRef.current;
        if (!container) {
            return undefined;
        }

        const resizeObserver = new ResizeObserver(updateDrawRect);
        resizeObserver.observe(container);
        video?.addEventListener('loadedmetadata', updateDrawRect);
        video?.addEventListener('resize', updateDrawRect);
        window.addEventListener('resize', updateDrawRect);

        return () => {
            resizeObserver.disconnect();
            video?.removeEventListener('loadedmetadata', updateDrawRect);
            video?.removeEventListener('resize', updateDrawRect);
            window.removeEventListener('resize', updateDrawRect);
        };
    }, [stageRef, videoRef, updateDrawRect]);

    const clearAnnotationEditorSelection = useCallback((editor: Editor) => {
        if (editor.getEditingShapeId()) {
            editor.complete();
        }

        if (editor.getSelectedShapeIds().length > 0) {
            editor.selectNone();
        }

        setSelectedShapeIds([]);
    }, []);

    const syncShapeVisibility = useCallback((editor: Editor, playbackTime: number) => {
        const shapes = editor.getCurrentPageShapes();
        const editingShapeId = editor.getEditingShapeId();
        const selectedIds = new Set(editor.getSelectedShapeIds());
        const updates: Array<{ id: TLShapeId; type: TLShape['type']; opacity: number }> = [];

        shapes.forEach((shape) => {
            const timing = resolveShapeTiming(shape.id, shape.meta, shapeTimingsRef.current);
            const shouldShow = resolveAnnotationShapeVisible({
                globalVisible: enabledRef.current,
                playbackTime,
                fps: fpsRef.current,
                timing,
                isEditing: editingShapeId === shape.id,
                isSelectedInEditMode: enabledRef.current && selectedIds.has(shape.id),
            });
            const nextOpacity = shouldShow ? 1 : 0;

            if (shape.opacity !== nextOpacity) {
                updates.push({ id: shape.id, type: shape.type, opacity: nextOpacity });
            }
        });

        if (updates.length === 0) {
            return;
        }

        editor.run(() => {
            editor.updateShapes(updates);
        }, { history: 'ignore' });
    }, []);

    const handlePlaybackTimeChange = useCallback((editor: Editor, playbackTime: number) => {
        const lastTime = lastPlaybackTimeForSelectionRef.current;

        if (hasPlaybackTimeAdvanced(lastTime, playbackTime, fpsRef.current) && !isRangeHandleDraggingRef.current) {
            clearAnnotationEditorSelection(editor);
        }

        lastPlaybackTimeForSelectionRef.current = snapTimeToFrame(playbackTime, fpsRef.current);
        syncShapeVisibility(editor, playbackTime);
    }, [clearAnnotationEditorSelection, syncShapeVisibility]);

    useEffect(() => {
        const video = videoRef.current;
        const resolvedDuration = (
            video
            && video.readyState >= 1
            && Number.isFinite(video.duration)
            && video.duration > 0
        )
            ? video.duration
            : duration;

        if (hasRepairedTimingsRef.current || resolvedDuration <= 0) {
            return;
        }

        const normalized = normalizeShapeTimingsForDuration(shapeTimings, resolvedDuration, fps);
        hasRepairedTimingsRef.current = true;
        if (normalized !== shapeTimings) {
            onShapeTimingsChange(normalized);
        }
    }, [duration, fps, onShapeTimingsChange, shapeTimings, videoRef]);

    const syncEditorShapeTimingMeta = useCallback((editor: Editor) => {
        const playback = getPlaybackContext(videoRef, currentTimeRef, durationRef);
        const resolvedDuration = playback.duration;
        if (resolvedDuration <= 0) {
            return;
        }

        const metaUpdates: Array<{ id: TLShapeId; type: TLShape['type']; meta: TLShape['meta'] }> = [];

        editor.getCurrentPageShapes().forEach((shape) => {
            const fromMeta = getReplayTimingFromMeta(shape.meta);
            const fromStore = shapeTimingsRef.current[shape.id];
            const timing = fromStore ?? fromMeta;
            if (!timing) {
                return;
            }

            const clamped = clampAnnotationTiming(timing, resolvedDuration, fpsRef.current);
            if (!replayTimingMetaNeedsSync(shape.meta, clamped)) {
                return;
            }

            metaUpdates.push({
                id: shape.id,
                type: shape.type,
                meta: {
                    ...shape.meta,
                    [REPLAY_TIMING_META_KEY]: {
                        startTime: clamped.startTime,
                        endTime: clamped.endTime,
                    },
                },
            });
        });

        if (metaUpdates.length === 0) {
            return;
        }

        editor.run(() => {
            editor.updateShapes(metaUpdates);
        }, { history: 'ignore' });
    }, [videoRef]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !isEditorReady) {
            return;
        }

        syncEditorShapeTimingMeta(editor);
        const playback = getPlaybackContext(videoRef, currentTimeRef, durationRef);
        syncShapeVisibility(editor, playback.currentTime);
    }, [duration, fps, isEditorReady, shapeTimings, syncEditorShapeTimingMeta, syncShapeVisibility, videoRef]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !isEditorReady) {
            return undefined;
        }

        const resolvePlaybackTime = () => {
            const video = videoRef.current;
            if (video && video.readyState >= 1 && Number.isFinite(video.currentTime)) {
                return video.currentTime;
            }
            return currentTimeRef.current;
        };

        const syncPlayback = () => {
            handlePlaybackTimeChange(editor, resolvePlaybackTime());
        };

        syncPlayback();

        const video = videoRef.current;
        if (!video) {
            return undefined;
        }

        video.addEventListener('timeupdate', syncPlayback);
        video.addEventListener('seeked', syncPlayback);

        return () => {
            video.removeEventListener('timeupdate', syncPlayback);
            video.removeEventListener('seeked', syncPlayback);
        };
    }, [currentTime, enabled, isEditorReady, shapeTimings, handlePlaybackTimeChange, videoRef]);

    const handleMount = useCallback((editor: Editor) => {
        editorRef.current = editor;
        setIsEditorReady(true);

        const { width, height } = stageCanvasRef.current;
        configureAnnotationEditor(editor, width, height);
        editor.updateInstanceState({ isReadonly: !enabledRef.current });
        editor.setCurrentTool('draw');

        const assignTimingToNewShapes = () => {
            const shapes = editor.getCurrentPageShapes();
            const nextTimings = { ...shapeTimingsRef.current };
            let changed = false;

            const { width: stageW, height: stageH } = stageCanvasRef.current;
            if (stageW > 0 && stageH > 0) {
                repairAnnotationShapeStyles(editor, stageW, stageH);
            }

            const playback = getPlaybackContext(videoRef, currentTimeRef, durationRef);
            const metaUpdates: Array<{ id: TLShapeId; type: TLShape['type']; meta: TLShape['meta'] }> = [];

            shapes.forEach((shape) => {
                let timing = nextTimings[shape.id] ?? getReplayTimingFromMeta(shape.meta);

                if (!timing) {
                    timing = buildDefaultAnnotationTiming(
                        playback.currentTime,
                        playback.duration,
                        fpsRef.current,
                    );
                    changed = true;
                } else if (playback.duration > 0) {
                    const clamped = clampAnnotationTiming(timing, playback.duration, fpsRef.current);
                    if (
                        clamped.startTime !== timing.startTime
                        || clamped.endTime !== timing.endTime
                    ) {
                        timing = clamped;
                        changed = true;
                    }
                }

                if (nextTimings[shape.id] !== timing) {
                    nextTimings[shape.id] = timing;
                    changed = true;
                }

                if (replayTimingMetaNeedsSync(shape.meta, timing)) {
                    metaUpdates.push({
                        id: shape.id,
                        type: shape.type,
                        meta: {
                            ...shape.meta,
                            [REPLAY_TIMING_META_KEY]: {
                                startTime: timing.startTime,
                                endTime: timing.endTime,
                            },
                        },
                    });
                }
            });

            if (metaUpdates.length > 0) {
                editor.updateShapes(metaUpdates);
            }

            if (changed) {
                onShapeTimingsChange(nextTimings);
            }
        };

        const removeDeletedShapeTimings = () => {
            const liveShapeIds = new Set(editor.getCurrentPageShapeIds());
            const nextTimings = { ...shapeTimingsRef.current };
            let changed = false;

            Object.keys(nextTimings).forEach((shapeId) => {
                if (!liveShapeIds.has(shapeId as TLShapeId)) {
                    delete nextTimings[shapeId];
                    changed = true;
                }
            });

            if (changed) {
                onShapeTimingsChange(nextTimings);
            }
        };

        const cleanupListener = editor.store.listen(({ changes }) => {
            assignTimingToNewShapes();
            removeDeletedShapeTimings();

            const shapeRecordsTouched = [
                ...Object.keys(changes.added),
                ...Object.keys(changes.updated),
                ...Object.keys(changes.removed),
            ].some(isShapeRecordId);

            if (shapeRecordsTouched) {
                const video = videoRef.current;
                const playbackTime = video && video.readyState >= 1
                    ? video.currentTime
                    : currentTimeRef.current;
                syncShapeVisibility(editor, playbackTime);
            }
        }, { scope: 'document', source: 'user' });

        assignTimingToNewShapes();
        syncEditorShapeTimingMeta(editor);
        syncShapeVisibility(editor, currentTimeRef.current);

        if (width > 0 && height > 0) {
            syncAnnotationViewport(editor, width, height);
        }

        return () => {
            cleanupListener();
            editorRef.current = null;
            setIsEditorReady(false);
            setSelectedShapeIds([]);
        };
    }, [onShapeTimingsChange, syncEditorShapeTimingMeta, syncShapeVisibility]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) {
            return;
        }

        editor.updateInstanceState({ isReadonly: !enabled });

        if (isEditorReady && enabled) {
            const playback = getPlaybackContext(videoRef, currentTimeRef, durationRef);
            syncShapeVisibility(editor, playback.currentTime);
        }
    }, [enabled, isEditorReady, syncShapeVisibility, videoRef]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !isEditorReady) {
            return;
        }

        const playback = getPlaybackContext(videoRef, currentTimeRef, durationRef);
        syncShapeVisibility(editor, playback.currentTime);
    }, [isEditorReady, selectedShapeIds, syncShapeVisibility, videoRef]);

    const layerStyle = useMemo(() => ({
        left: drawRect.x,
        top: drawRect.y,
        width: drawRect.width,
        height: drawRect.height,
    }), [drawRect]);

    const shouldMountEditor = drawRect.width > 0 && drawRect.height > 0 && videoSourceReady;

    const editorMountKey = useMemo(
        () => `${tldrawPersistenceKey ?? 'ephemeral'}:${Math.round(drawRect.width)}x${Math.round(drawRect.height)}`,
        [drawRect.height, drawRect.width, tldrawPersistenceKey],
    );

    return (
        <>
            {shouldMountEditor && (
                <div
                    className={`${styles.annotationLayer} ${enabled ? styles.annotationLayerInteractive : styles.annotationLayerPassive}`}
                    style={layerStyle}
                >
                    <Tldraw
                        key={editorMountKey}
                        persistenceKey={tldrawPersistenceKey ?? undefined}
                        hideUi
                        shapeUtils={ANNOTATION_SHAPE_UTILS}
                        components={ANNOTATION_COMPONENTS}
                        onMount={handleMount}
                    >
                        <AnnotationSelectionSync onSelectionChange={handleSelectionChange} />
                        {enabled && (
                            <AnnotationToolbarPortal
                                containerRef={toolbarSlotRef}
                                stageWidth={drawRect.width}
                                stageHeight={drawRect.height}
                            />
                        )}
                    </Tldraw>
                </div>
            )}

            <div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex items-start justify-end gap-2">
                <div ref={toolbarSlotRef} className="pointer-events-auto empty:hidden" />
                <label className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 shadow-lg backdrop-blur-sm">
                    <span className="text-xs font-medium text-white/70">Annotate {enabled ? 'On' : 'is Off'}</span>
                    <Switch
                        checked={enabled}
                        onCheckedChange={onToggleEnabled}
                        className={styles.annotateSwitch}
                        aria-label={`Toggle annotation tools for video ${videoIndex + 1}`}
                    />
                </label>
            </div>

            {enabled && shouldMountEditor && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/70 via-black/35 to-transparent pt-8">
                    <AnnotationPlaybackSlider
                        mode={sliderMode}
                        videoIndex={videoIndex}
                        currentTime={currentTime}
                        duration={duration}
                        seekAmount={seekAmount}
                        rangeStart={selectedTiming?.startTime ?? currentTime}
                        rangeEnd={selectedTiming?.endTime ?? Math.min(currentTime + 1, duration)}
                        onSeek={onSeek}
                        onRangeChange={selectedTiming ? handleRangeChange : undefined}
                        onRangeHandleDrag={selectedTiming ? handleRangeHandleDrag : undefined}
                    />
                </div>
            )}
        </>
    );
}
