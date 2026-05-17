'use client';

import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { TrajectoryMetadata } from '../lib/trajectory-types';
import {
    buildAdjacencyMap,
    computeDistToNearestAnchor,
    cssPixelsToPoseUnits,
    cssToPoseCoords,
    findAnchorLandmarks,
    findChainToAnchor,
    findLastPoseFrameAtOrBefore,
    getLandmarkGroup,
    HIP_TO_ANKLE_ANCHOR,
    hitTestLandmark,
    isDraggable,
    SHOULDER_SIBLINGS,
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
    /** Minimum hop count from each joint to the nearest anchor (multi-source BFS). */
    distToAnchor: Map<number, number>;
};

type DragState = {
    sourceIndex: number;
    chain: number[];
    initialPositions: Map<number, Pos2D>;
    initialZ: Map<number, number | null>;
    /**
     * Raw frame landmark positions (no overrides applied). Used as the bone
     * length reference in FABRIK so lengths never drift across drag gestures.
     */
    rawPositions: Map<number, Pos2D>;
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
                ? (() => {
                    const adjacencyMap = buildAdjacencyMap(source.metadata.pose.skeletonConnections);
                    const anchors = findAnchorLandmarks(source.metadata.pose.skeletonConnections);
                    const distToAnchor = computeDistToNearestAnchor(adjacencyMap, anchors);
                    return { adjacencyMap, anchors, distToAnchor };
                })()
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

            // Hips are normally IK anchors, so findChainToAnchor would return a
            // chain of length 1 and the hip would teleport freely.  Override:
            // use the ankle of the same leg as the anchor so the drag is
            // constrained by the hip → knee → ankle chain (foot stays planted).
            const ankleAnchor = HIP_TO_ANKLE_ANCHOR.get(representativeIndex);
            const effectiveAnchors = ankleAnchor != null
                ? new Set([ankleAnchor])
                : ikMeta.anchors;

            const chain = findChainToAnchor(ikMeta.adjacencyMap, representativeIndex, effectiveAnchors);
            if (!chain) return;

            // Freeze initial positions (frame landmarks merged with current overrides).
            const currentTime = source.videoRef.current?.currentTime ?? 0;
            const frameIdx = findLastPoseFrameAtOrBefore(source.metadata.pose.frames, currentTime);
            if (frameIdx < 0) return;
            const frame = source.metadata.pose.frames[frameIdx];
            if (!frame.landmarks) return;

            const sourceOverrides = overridesRef.current[bestSourceIndex];
            const rawPositions = new Map<number, Pos2D>();
            const initialPositions = new Map<number, Pos2D>();
            const initialZ = new Map<number, number | null>();
            frame.landmarks.forEach((lm, i) => {
                if (!lm) return;
                // Raw positions are always from the original frame — used as
                // the bone length reference so lengths never drift.
                rawPositions.set(i, { x: lm.x, y: lm.y });
                // Working positions include current overrides so the drag
                // continues smoothly from wherever joints were left.
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
                rawPositions,
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
            const { sourceIndex, chain, initialPositions, initialZ, rawPositions, group, representativeIndex, groupOffset } = drag;
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

            const ikResult = solveFABRIK(chain, initialPositions, adjustedTarget, 10, initialZ, rawPositions);
            if (ikResult.size === 0) return;

            // Propagate each chain joint's displacement to its off-chain branches
            // so that joints hanging off the chain (e.g. the arm off a shoulder)
            // move with the chain rather than staying behind and over-stretching.
            //
            // We use the precomputed distance-to-nearest-anchor to determine
            // kinematic direction: a neighbor is "downstream" only if its anchor
            // distance is strictly greater than the current joint's anchor distance.
            // This prevents cross-body flooding — e.g. dragging the left shoulder
            // won't translate the right shoulder, because the right shoulder sits
            // at equal anchor distance (both hips are anchors) and is filtered out.
            const ikMeta = ikMetasRef.current[sourceIndex];
            if (ikMeta) {
                const chainSet = new Set(chain);
                for (let ci = 0; ci < chain.length - 1; ci++) {
                    const jointIdx = chain[ci];
                    const newPos = ikResult.get(jointIdx);
                    const origPos = initialPositions.get(jointIdx);
                    if (!newPos || !origPos) continue;
                    const dx = newPos.x - origPos.x;
                    const dy = newPos.y - origPos.y;
                    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) continue;

                    const jointDist = ikMeta.distToAnchor.get(jointIdx) ?? 0;
                    const branchVisited = new Set<number>(chainSet);
                    branchVisited.add(jointIdx);
                    const branchQueue: number[] = [];

                    // Seed with direct neighbors that are strictly further from all anchors.
                    for (const neighbor of ikMeta.adjacencyMap.get(jointIdx) ?? []) {
                        if (branchVisited.has(neighbor)) continue;
                        const neighborDist = ikMeta.distToAnchor.get(neighbor) ?? 0;
                        if (neighborDist > jointDist) {
                            branchVisited.add(neighbor);
                            branchQueue.push(neighbor);
                        }
                    }

                    // Also carry the shoulder sibling (if any) so the cross-shoulder
                    // bone never stretches.  The sibling is at equal anchor distance
                    // so the normal `> jointDist` filter would exclude it, but we
                    // explicitly include it here to keep shoulder width intact.
                    const shoulderSibling = SHOULDER_SIBLINGS.get(jointIdx);
                    if (shoulderSibling != null && !branchVisited.has(shoulderSibling)) {
                        branchVisited.add(shoulderSibling);
                        branchQueue.push(shoulderSibling);
                    }

                    while (branchQueue.length > 0) {
                        const node = branchQueue.shift()!;
                        // Only set if not yet written (group code below may refine later).
                        if (!ikResult.has(node)) {
                            const origNodePos = initialPositions.get(node);
                            if (origNodePos) {
                                ikResult.set(node, { x: origNodePos.x + dx, y: origNodePos.y + dy });
                            }
                        }
                        const nodeDist = ikMeta.distToAnchor.get(node) ?? 0;
                        for (const n of ikMeta.adjacencyMap.get(node) ?? []) {
                            if (!branchVisited.has(n)) {
                                const nDist = ikMeta.distToAnchor.get(n) ?? 0;
                                if (nDist > nodeDist) {
                                    branchVisited.add(n);
                                    branchQueue.push(n);
                                }
                            }
                        }
                    }
                }
            }

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
