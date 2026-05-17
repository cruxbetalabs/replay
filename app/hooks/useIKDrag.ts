'use client';

import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { TrajectoryMetadata } from '../lib/trajectory-types';
import {
    buildAdjacencyMap,
    cssPixelsToPoseUnits,
    cssToPoseCoords,
    findAnchorLandmarks,
    findChainToAnchor,
    findLastPoseFrameAtOrBefore,
    getLandmarkGroup,
    hitTestLandmark,
    isDraggable,
    solveFABRIK,
} from '../lib/pose-ik';
import type { Pos2D } from '../lib/pose-ik';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IKDragSource {
    metadata: TrajectoryMetadata | null;
    videoRef: RefObject<HTMLVideoElement | null>;
    canRender: boolean;
}

type IKMeta = {
    adjacencyMap: Map<number, number[]>;
    anchors: Set<number>;
};

type DragState = {
    sourceIndex: number;
    chain: number[];
    initialPositions: Map<number, Pos2D>;
    initialZ: Map<number, number | null>;
    group: readonly number[] | null;
    representativeIndex: number;
    /** Offset from the IK representative to the actually-grabbed landmark. */
    groupOffset: Pos2D;
};

export interface IKDragResult {
    /** Landmark position overrides, one entry per source in input order. */
    overrides: ReadonlyArray<Map<number, Pos2D> | null>;
    cursor: string;
    hasOverrides: boolean;
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    resetIK: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Encapsulates all FABRIK inverse-kinematics drag state and pointer-event
 * logic for one or more aligned video sources rendered on a shared stage div.
 *
 * Pass `sources` in stable order (the array length must not change between
 * renders). `overrides[i]` corresponds to `sources[i]`.
 *
 * Wire the returned handlers to the stage div and pass `overrides[i]` to each
 * `TrajectoryOverlay` as `landmarkOverrides`.
 */
export function useIKDrag(
    sources: ReadonlyArray<IKDragSource>,
    showPose: boolean,
): IKDragResult {
    const [overrides, setOverrides] = useState<Array<Map<number, Pos2D> | null>>(
        () => Array.from({ length: sources.length }, () => null),
    );
    const [cursor, setCursor] = useState<string>('default');

    // ── Stable refs (all mutable values read inside pointer callbacks) ────────

    const sourcesRef = useRef(sources);
    sourcesRef.current = sources;

    const overridesRef = useRef(overrides);
    overridesRef.current = overrides;

    const showPoseRef = useRef(showPose);
    showPoseRef.current = showPose;

    // ── Per-source ikMeta — ref-based manual memoization ─────────────────────
    // Recomputes adjacency map + anchors only when a source's metadata changes,
    // without needing a useMemo call inside a loop (which would violate Rules of Hooks).

    const prevMetadatasRef = useRef<Array<TrajectoryMetadata | null>>(
        Array.from({ length: sources.length }, () => null),
    );
    const ikMetasRef = useRef<Array<IKMeta | null>>(
        Array.from({ length: sources.length }, () => null),
    );

    sources.forEach((source, i) => {
        if (source.metadata !== prevMetadatasRef.current[i]) {
            prevMetadatasRef.current[i] = source.metadata;
            ikMetasRef.current[i] = source.metadata?.pose
                ? {
                    adjacencyMap: buildAdjacencyMap(source.metadata.pose.skeletonConnections),
                    anchors: findAnchorLandmarks(source.metadata.pose.skeletonConnections),
                }
                : null;
        }
    });

    // ── Drag state ────────────────────────────────────────────────────────────

    const dragRef = useRef<DragState | null>(null);

    const cursorRef = useRef('default');
    const updateCursor = useCallback((next: string) => {
        if (cursorRef.current !== next) {
            cursorRef.current = next;
            setCursor(next);
        }
    }, []);

    // ── Hit-test helper ───────────────────────────────────────────────────────

    const tryHit = useCallback(
        (
            sourceIndex: number,
            cssX: number,
            cssY: number,
            containerWidth: number,
            containerHeight: number,
        ): { landmarkIndex: number; dist: number } | null => {
            const source = sourcesRef.current[sourceIndex];
            if (!source) return null;
            const { metadata, videoRef, canRender } = source;
            if (!metadata?.pose || !canRender) return null;

            const currentTime = videoRef.current?.currentTime ?? 0;
            const frameIdx = findLastPoseFrameAtOrBefore(metadata.pose.frames, currentTime);
            if (frameIdx < 0) return null;
            const frame = metadata.pose.frames[frameIdx];
            if (!frame.landmarks) return null;

            const sourceOverrides = overridesRef.current[sourceIndex];
            const effLandmarks = frame.landmarks.map((lm, i) => {
                if (!lm || !isDraggable(i)) return null;
                const ov = sourceOverrides?.get(i);
                return ov ? { ...lm, ...ov } : lm;
            });

            const poseCoords = cssToPoseCoords(cssX, cssY, containerWidth, containerHeight, metadata);
            if (!poseCoords) return null;
            const threshold = cssPixelsToPoseUnits(16, containerWidth, containerHeight, metadata);
            const index = hitTestLandmark(effLandmarks, poseCoords.x, poseCoords.y, threshold);
            if (index === null) return null;

            const lm = effLandmarks[index];
            if (!lm) return null;
            return { landmarkIndex: index, dist: Math.hypot(lm.x - poseCoords.x, lm.y - poseCoords.y) };
        },
        [],
    );

    // ── Pointer handlers ──────────────────────────────────────────────────────

    const onPointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!showPoseRef.current) return;

            const rect = e.currentTarget.getBoundingClientRect();
            const cssX = e.clientX - rect.left;
            const cssY = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;

            // Find the closest landmark across all sources.
            let bestSourceIndex = -1;
            let bestLandmarkIndex = -1;
            let bestDist = Infinity;

            for (let i = 0; i < sourcesRef.current.length; i++) {
                const hit = tryHit(i, cssX, cssY, w, h);
                if (hit && hit.dist < bestDist) {
                    bestDist = hit.dist;
                    bestSourceIndex = i;
                    bestLandmarkIndex = hit.landmarkIndex;
                }
            }

            if (bestSourceIndex < 0) return;

            const source = sourcesRef.current[bestSourceIndex];
            const ikMeta = ikMetasRef.current[bestSourceIndex];
            if (!source.metadata?.pose || !ikMeta) return;

            // Route IK through the group representative so the whole hand/foot
            // moves as a rigid unit when any member is grabbed.
            const group = getLandmarkGroup(bestLandmarkIndex);
            const representativeIndex = group ? group[0] : bestLandmarkIndex;

            const chain = findChainToAnchor(ikMeta.adjacencyMap, representativeIndex, ikMeta.anchors);
            if (!chain) return;

            // Freeze initial positions (frame landmarks merged with current overrides).
            const currentTime = source.videoRef.current?.currentTime ?? 0;
            const frameIdx = findLastPoseFrameAtOrBefore(source.metadata.pose.frames, currentTime);
            if (frameIdx < 0) return;
            const frame = source.metadata.pose.frames[frameIdx];
            if (!frame.landmarks) return;

            const sourceOverrides = overridesRef.current[bestSourceIndex];
            const initialPositions = new Map<number, Pos2D>();
            const initialZ = new Map<number, number | null>();
            frame.landmarks.forEach((lm, i) => {
                if (!lm) return;
                const ov = sourceOverrides?.get(i);
                initialPositions.set(i, ov ? { x: ov.x, y: ov.y } : { x: lm.x, y: lm.y });
                initialZ.set(i, lm.z ?? null);
            });

            // Offset from the representative to the grabbed landmark so the cursor
            // stays anchored to where the user actually grabbed, not the wrist/ankle.
            const repPos = initialPositions.get(representativeIndex) ?? { x: 0, y: 0 };
            const clickedPos = initialPositions.get(bestLandmarkIndex) ?? repPos;
            const groupOffset: Pos2D = {
                x: clickedPos.x - repPos.x,
                y: clickedPos.y - repPos.y,
            };

            dragRef.current = {
                sourceIndex: bestSourceIndex,
                chain,
                initialPositions,
                initialZ,
                group,
                representativeIndex,
                groupOffset,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
            updateCursor('grabbing');
        },
        [tryHit, updateCursor],
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const cssX = e.clientX - rect.left;
            const cssY = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;

            const drag = dragRef.current;

            if (!drag) {
                // Hover: show grab cursor when near any draggable landmark.
                if (showPoseRef.current) {
                    const nearAny = sourcesRef.current.some((_, i) => tryHit(i, cssX, cssY, w, h) !== null);
                    updateCursor(nearAny ? 'grab' : 'default');
                }
                return;
            }

            // Active drag: solve IK and commit overrides.
            const { sourceIndex, chain, initialPositions, initialZ, group, representativeIndex, groupOffset } = drag;
            const source = sourcesRef.current[sourceIndex];
            if (!source?.metadata) return;

            const poseTarget = cssToPoseCoords(cssX, cssY, w, h, source.metadata);
            if (!poseTarget) return;

            // Adjust target so the representative reaches the position that keeps
            // the originally-grabbed landmark under the cursor.
            const adjustedTarget: Pos2D = {
                x: poseTarget.x - groupOffset.x,
                y: poseTarget.y - groupOffset.y,
            };

            const ikResult = solveFABRIK(chain, initialPositions, adjustedTarget, 10, initialZ);
            if (ikResult.size === 0) return;

            // Propagate representative displacement to all other group members
            // so the hand/foot translates as a rigid body.
            if (group && group.length > 1) {
                const repNew = ikResult.get(representativeIndex);
                const repOrig = initialPositions.get(representativeIndex);
                if (repNew && repOrig) {
                    const dx = repNew.x - repOrig.x;
                    const dy = repNew.y - repOrig.y;
                    for (const memberIdx of group) {
                        if (memberIdx === representativeIndex) continue;
                        const origPos = initialPositions.get(memberIdx);
                        if (origPos) {
                            ikResult.set(memberIdx, { x: origPos.x + dx, y: origPos.y + dy });
                        }
                    }
                }
            }

            setOverrides((prev) => {
                const next = [...prev];
                const sourceMap = new Map(next[sourceIndex] ?? []);
                ikResult.forEach((pos, idx) => sourceMap.set(idx, pos));
                next[sourceIndex] = sourceMap;
                return next;
            });
        },
        [tryHit, updateCursor],
    );

    const onPointerUp = useCallback(() => {
        dragRef.current = null;
        updateCursor('default');
    }, [updateCursor]);

    const onPointerLeave = useCallback(() => {
        if (!dragRef.current) updateCursor('default');
    }, [updateCursor]);

    const resetIK = useCallback(() => {
        setOverrides((prev) => prev.map(() => null));
        dragRef.current = null;
        updateCursor('default');
    }, [updateCursor]);

    const hasOverrides = overrides.some((ov) => ov !== null && ov.size > 0);

    return {
        overrides,
        cursor,
        hasOverrides,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerLeave,
        resetIK,
    };
}
