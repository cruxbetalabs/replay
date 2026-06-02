'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { AnnotationToolbarPortal } from './AnnotationToolbarPortal';
import {
    DefaultColorStyle,
    DefaultSizeStyle,
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
import {
    buildDefaultAnnotationTiming,
    clampAnnotationTiming,
    getAnnotationSizeForVideoDimensions,
    getTldrawPersistenceKey,
    isAnnotationVisibleAtTime,
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

const ACCENT_COLORS = ['blue', 'green'] as const;

function syncAnnotationViewport(
    editor: Editor,
    videoWidth: number,
    videoHeight: number,
) {
    editor.updateInstanceState({ isGridMode: false });

    editor.setCameraOptions({
        isLocked: true,
        wheelBehavior: 'none',
        panSpeed: 0,
        zoomSpeed: 0,
        constraints: {
            bounds: { x: 0, y: 0, w: videoWidth, h: videoHeight },
            padding: { x: 0, y: 0 },
            origin: { x: 0.5, y: 0.5 },
            initialZoom: 'fit-min',
            baseZoom: 'fit-min',
            behavior: { x: 'fixed', y: 'fixed' },
        },
    });

    editor.zoomToBounds(
        { x: 0, y: 0, w: videoWidth, h: videoHeight },
        { inset: 0, immediate: true, force: true },
    );
}

function syncAnnotationStyles(
    editor: Editor,
    videoWidth: number,
    videoHeight: number,
    accentColor: (typeof ACCENT_COLORS)[number],
) {
    editor.setStyleForNextShapes(DefaultColorStyle, accentColor);
    editor.setStyleForNextShapes(
        DefaultSizeStyle,
        getAnnotationSizeForVideoDimensions(videoWidth, videoHeight),
    );
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
    const videoDimensionsRef = useRef({ width: 0, height: 0 });
    const shapeTimingsRef = useRef(shapeTimings);
    const currentTimeRef = useRef(currentTime);
    const durationRef = useRef(duration);
    const fpsRef = useRef(fps);
    const enabledRef = useRef(enabled);
    const [drawRect, setDrawRect] = useState<DrawRect>({ x: 0, y: 0, width: 0, height: 0 });
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [selectedShapeIds, setSelectedShapeIds] = useState<TLShapeId[]>([]);

    shapeTimingsRef.current = shapeTimings;
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
    fpsRef.current = fps;
    enabledRef.current = enabled;

    const tldrawPersistenceKey = getTldrawPersistenceKey(persistenceKey, videoIndex);
    const accentColor = ACCENT_COLORS[videoIndex];
    const selectedShapeId = selectedShapeIds.length === 1 ? selectedShapeIds[0] : null;
    const selectedTiming = selectedShapeId ? shapeTimings[selectedShapeId] ?? null : null;
    const sliderMode = selectedTiming ? 'range' : 'scrub';

    const handleSelectionChange = useCallback((nextSelectedShapeIds: TLShapeId[]) => {
        setSelectedShapeIds(nextSelectedShapeIds);
    }, []);

    const handleRangeChange = useCallback((startTime: number, endTime: number) => {
        if (!selectedShapeId) {
            return;
        }

        const nextTiming = clampAnnotationTiming({ startTime, endTime }, duration, fps);
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
        videoDimensionsRef.current = { width: sourceWidth, height: sourceHeight };
        setDrawRect(contained);
    }, [stageRef, videoRef]);

    useEffect(() => {
        const editor = editorRef.current;
        const { width, height } = videoDimensionsRef.current;
        if (!editor || !isEditorReady || width <= 0 || height <= 0 || drawRect.width <= 0) {
            return undefined;
        }

        const frameId = requestAnimationFrame(() => {
            syncAnnotationViewport(editor, width, height);
            syncAnnotationStyles(editor, width, height, accentColor);
        });

        return () => cancelAnimationFrame(frameId);
    }, [accentColor, drawRect, isEditorReady]);

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

    const syncShapeVisibility = useCallback((editor: Editor, time: number) => {
        const shapes = editor.getCurrentPageShapes();
        const updates: TLShape[] = [];

        shapes.forEach((shape) => {
            const timing = shapeTimingsRef.current[shape.id];
            const shouldShow = timing
                ? isAnnotationVisibleAtTime(timing, time)
                : enabledRef.current;
            const nextOpacity = shouldShow ? 1 : 0;

            if (shape.opacity !== nextOpacity) {
                updates.push({ ...shape, opacity: nextOpacity });
            }
        });

        if (updates.length > 0) {
            editor.updateShapes(updates);
        }
    }, []);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !isEditorReady) {
            return;
        }

        syncShapeVisibility(editor, currentTime);
    }, [currentTime, enabled, isEditorReady, shapeTimings, syncShapeVisibility]);

    const handleMount = useCallback((editor: Editor) => {
        editorRef.current = editor;
        setIsEditorReady(true);

        const { width, height } = videoDimensionsRef.current;
        syncAnnotationStyles(editor, width, height, accentColor);
        editor.updateInstanceState({ isReadonly: !enabledRef.current });
        editor.setCurrentTool('draw');

        const assignTimingToNewShapes = () => {
            const shapes = editor.getCurrentPageShapes();
            const nextTimings = { ...shapeTimingsRef.current };
            let changed = false;

            shapes.forEach((shape) => {
                if (nextTimings[shape.id]) {
                    return;
                }

                nextTimings[shape.id] = buildDefaultAnnotationTiming(
                    currentTimeRef.current,
                    durationRef.current,
                    fpsRef.current,
                );
                changed = true;
            });

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

        const cleanupListener = editor.store.listen(() => {
            assignTimingToNewShapes();
            removeDeletedShapeTimings();
            syncShapeVisibility(editor, currentTimeRef.current);
        }, { scope: 'document' });

        assignTimingToNewShapes();
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
    }, [accentColor, onShapeTimingsChange, syncShapeVisibility]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) {
            return;
        }

        editor.updateInstanceState({ isReadonly: !enabled });
    }, [enabled]);

    const layerStyle = useMemo(() => ({
        left: drawRect.x,
        top: drawRect.y,
        width: drawRect.width,
        height: drawRect.height,
    }), [drawRect]);

    const shouldMountEditor = drawRect.width > 0 && drawRect.height > 0;

    return (
        <>
            {shouldMountEditor && (
                <div
                    className={`${styles.annotationLayer} ${enabled ? styles.annotationLayerInteractive : styles.annotationLayerPassive}`}
                    style={layerStyle}
                >
                    <Tldraw
                        persistenceKey={tldrawPersistenceKey ?? undefined}
                        hideUi
                        components={ANNOTATION_COMPONENTS}
                        onMount={handleMount}
                    >
                        <AnnotationSelectionSync onSelectionChange={handleSelectionChange} />
                        {enabled && (
                            <AnnotationToolbarPortal containerRef={toolbarSlotRef} />
                        )}
                    </Tldraw>
                </div>
            )}

            <div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex items-start justify-end gap-2">
                <div ref={toolbarSlotRef} className="pointer-events-auto empty:hidden" />
                <label className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 shadow-lg backdrop-blur-sm">
                    <span className="text-xs font-medium text-white/70">Annotate</span>
                    <Switch
                        checked={enabled}
                        onCheckedChange={onToggleEnabled}
                        aria-label={`Toggle annotation layer for video ${videoIndex + 1}`}
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
                    />
                </div>
            )}
        </>
    );
}
