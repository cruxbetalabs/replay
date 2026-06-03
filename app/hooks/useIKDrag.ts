'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { TrajectoryMetadata } from '../lib/trajectory-types';
import {
    buildAdjacencyMap,
    computeDistToNearestAnchor,
    cssPixelsToPoseUnits,
    cssToPoseCoords,
    DEFAULT_IK_ANCHOR_JOINTS,
    findAnchorLandmarks,
    findChainToAnchor,
    findLastPoseFrameAtOrBefore,
    getLandmarkGroup,
    HIP_SIBLINGS,
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
    /** When false, this source is skipped for hit-testing and rendering. */
    poseVisible?: boolean;
}

type IKMeta = {
    adjacencyMap: Map<number, number[]>;
    /** Structural anchors (hips) — used as fallback when no ankles found. */
    anchors: Set<number>;
    /**
     * Minimum hop count from each joint to the nearest default IK anchor
     * (ankle joints).  Determines "downstream" direction for branch propagation.
     */
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
    /**
     * 2D bone lengths measured from initialPositions at drag-start, one per
     * consecutive pair in `chain`. Using these avoids snapping the skeleton to
     * 3D-estimated lengths that differ from the visible 2D projection.
     */
    chainBoneLengths: number[];
    group: readonly number[] | null;
    representativeIndex: number;
    /** Offset from the IK representative to the actually-grabbed landmark. */
    groupOffset: Pos2D;
};

const LEFT_HIP_INDEX = 23;
const RIGHT_HIP_INDEX = 24;

function preservePelvisWidth(
    ikResult: Map<number, Pos2D>,
    initialPositions: Map<number, Pos2D>,
) {
    const leftInitial = initialPositions.get(LEFT_HIP_INDEX);
    const rightInitial = initialPositions.get(RIGHT_HIP_INDEX);
    if (!leftInitial || !rightInitial) return;

    const leftSolved = ikResult.get(LEFT_HIP_INDEX) ?? leftInitial;
    const rightSolved = ikResult.get(RIGHT_HIP_INDEX) ?? rightInitial;
    if (!ikResult.has(LEFT_HIP_INDEX) && !ikResult.has(RIGHT_HIP_INDEX)) return;

    const initialWidth = Math.hypot(
        rightInitial.x - leftInitial.x,
        rightInitial.y - leftInitial.y,
    );
    if (initialWidth <= 0) return;

    const midpoint: Pos2D = {
        x: (leftSolved.x + rightSolved.x) / 2,
        y: (leftSolved.y + rightSolved.y) / 2,
    };

    let vx = rightSolved.x - leftSolved.x;
    let vy = rightSolved.y - leftSolved.y;
    const solvedWidth = Math.hypot(vx, vy);
    if (solvedWidth <= 1e-6) {
        vx = rightInitial.x - leftInitial.x;
        vy = rightInitial.y - leftInitial.y;
    } else {
        vx /= solvedWidth;
        vy /= solvedWidth;
    }

    const halfWidth = initialWidth / 2;
    ikResult.set(LEFT_HIP_INDEX, {
        x: midpoint.x - vx * halfWidth,
        y: midpoint.y - vy * halfWidth,
    });
    ikResult.set(RIGHT_HIP_INDEX, {
        x: midpoint.x + vx * halfWidth,
        y: midpoint.y + vy * halfWidth,
    });
}

function buildIKMeta(metadata: TrajectoryMetadata): IKMeta | null {
    if (!metadata.pose) return null;

    const adjacencyMap = buildAdjacencyMap(metadata.pose.skeletonConnections);
    const anchors = findAnchorLandmarks(metadata.pose.skeletonConnections);
    // Use ankle joints as BFS roots so distToAnchor describes "distance from
    // feet"; fall back to structural anchors if ankles are missing.
    const ikAnchors = (adjacencyMap.has(27) && adjacencyMap.has(28))
        ? DEFAULT_IK_ANCHOR_JOINTS
        : anchors;
    const distToAnchor = computeDistToNearestAnchor(adjacencyMap, ikAnchors);

    return { adjacencyMap, anchors, distToAnchor };
}

export interface IKDragResult {
    /** Landmark position overrides, one entry per source in input order. */
    overrides: ReadonlyArray<Map<number, Pos2D> | null>;
    cursor: string;
    hasOverrides: boolean;
    /** Pinned joint indices per source. Pinned joints act as extra IK anchors. */
    pinnedJoints: ReadonlyArray<ReadonlySet<number>>;
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    /** Double-click on a landmark to toggle it as a pinned anchor. */
    onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    resetIK: () => void;
    clearPins: () => void;
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
    const [pinnedJoints, setPinnedJoints] = useState<Array<Set<number>>>(
        () => Array.from({ length: sources.length }, () => new Set<number>()),
    );

    // ── Stable refs (all mutable values read inside pointer callbacks) ────────

    const sourcesRef = useRef(sources);
    const overridesRef = useRef(overrides);
    const showPoseRef = useRef(showPose);
    const pinnedJointsRef = useRef(pinnedJoints);

    useLayoutEffect(() => {
        sourcesRef.current = sources;
        overridesRef.current = overrides;
        showPoseRef.current = showPose;
        pinnedJointsRef.current = pinnedJoints;
    }, [sources, overrides, showPose, pinnedJoints]);

    const ikMetas = useMemo(
        () => sources.map((source) => (source.metadata ? buildIKMeta(source.metadata) : null)),
        [sources],
    );

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
            const { metadata, videoRef, canRender, poseVisible = true } = source;
            if (!poseVisible || !metadata?.pose || !canRender) return null;

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
            const ikMeta = ikMetas[bestSourceIndex];
            if (!source.metadata?.pose || !ikMeta) return;

            // Route IK through the group representative so the whole hand/foot
            // moves as a rigid unit when any member is grabbed.
            const group = getLandmarkGroup(bestLandmarkIndex);
            const representativeIndex = group ? group[0] : bestLandmarkIndex;

            // Build effective anchors: start from DEFAULT_IK_ANCHOR_JOINTS (ankles)
            // plus any user-pinned joints, then remove the dragged joint so it can move.
            const userPins = pinnedJointsRef.current[bestSourceIndex] ?? new Set<number>();
            let effectiveAnchors = new Set([...DEFAULT_IK_ANCHOR_JOINTS, ...userPins]);
            if (effectiveAnchors.has(representativeIndex)) {
                effectiveAnchors = new Set([...effectiveAnchors].filter(a => a !== representativeIndex));
                // Nothing left → fall back to structural anchors (hips).
                if (effectiveAnchors.size === 0) {
                    effectiveAnchors = ikMeta.anchors;
                }
            }

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
                rawPositions.set(i, { x: lm.x, y: lm.y });
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

            // Measure bone lengths from the 2D positions visible right now.
            // Storing these prevents the skeleton from snapping to 3D-estimated
            // lengths that differ from the current frame's projection.
            const chainBoneLengths: number[] = [];
            for (let ci = 0; ci < chain.length - 1; ci++) {
                const a = initialPositions.get(chain[ci]);
                const b = initialPositions.get(chain[ci + 1]);
                chainBoneLengths.push(a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0);
            }

            dragRef.current = {
                sourceIndex: bestSourceIndex,
                chain,
                initialPositions,
                initialZ,
                rawPositions,
                chainBoneLengths,
                group,
                representativeIndex,
                groupOffset,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
            updateCursor('grabbing');
        },
        [ikMetas, tryHit, updateCursor],
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

            // Use the 2D lengths captured at drag-start — no 3D estimation needed.
            const { chainBoneLengths } = drag;
            const ikMeta = ikMetas[sourceIndex];

            const ikResult = solveFABRIK(
                chain,
                initialPositions,
                adjustedTarget,
                10,
                chainBoneLengths ? undefined : initialZ,
                chainBoneLengths ? undefined : rawPositions,
                chainBoneLengths,
            );
            if (ikResult.size === 0) return;

            // ── Branch propagation ──────────────────────────────────────────────
            // For every joint in the main chain that moved, rigidly translate all
            // off-chain joints that hang "downstream" (away from the foot anchors).
            // Shoulder and hip siblings are included explicitly so cross-body bones
            // never stretch, even though they sit at the same anchor-distance level.
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

                    // Seed with direct neighbors strictly further from foot anchors.
                    for (const neighbor of ikMeta.adjacencyMap.get(jointIdx) ?? []) {
                        if (branchVisited.has(neighbor)) continue;
                        const neighborDist = ikMeta.distToAnchor.get(neighbor) ?? 0;
                        if (neighborDist > jointDist) {
                            branchVisited.add(neighbor);
                            branchQueue.push(neighbor);
                        }
                    }

                    // Shoulder sibling: keep shoulder-width bone rigid.
                    const shoulderSibling = SHOULDER_SIBLINGS.get(jointIdx);
                    if (shoulderSibling != null && !branchVisited.has(shoulderSibling)) {
                        branchVisited.add(shoulderSibling);
                        branchQueue.push(shoulderSibling);
                    }

                    // Hip sibling: keep pelvis-width bone rigid.
                    // (Contralateral leg will be re-solved in the secondary pass below.)
                    const hipSibling = HIP_SIBLINGS.get(jointIdx);
                    if (hipSibling != null && !branchVisited.has(hipSibling)) {
                        branchVisited.add(hipSibling);
                        branchQueue.push(hipSibling);
                    }

                    while (branchQueue.length > 0) {
                        const node = branchQueue.shift()!;
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

                // ── Secondary FABRIK pass: re-solve contralateral legs ──────────
                // When HIP_SIBLINGS displaced a hip that isn't part of the main
                // chain, its leg joints need a proper IK solve (not rigid translation)
                // to keep the contralateral ankle at its fixed position.
                const chainSet2 = new Set(chain);
                for (const [hipIdx] of HIP_SIBLINGS) {
                    if (chainSet2.has(hipIdx)) continue; // already solved by main chain
                    const newHipPos = ikResult.get(hipIdx);
                    if (!newHipPos) continue; // wasn't displaced

                    // Find the leg chain from this hip to its ankle.
                    const ankleIdx = hipIdx === 23 ? 27 : 28;
                    const legChain = findChainToAnchor(ikMeta.adjacencyMap, hipIdx, new Set([ankleIdx]));
                    if (!legChain || legChain.length <= 1) continue;

                    // Measure leg bone lengths from current 2D positions (same
                    // approach as the main chain — no 3D-estimated snapping).
                    const legBoneLengths: number[] = [];
                    for (let li = 0; li < legChain.length - 1; li++) {
                        const a = initialPositions.get(legChain[li]);
                        const b = initialPositions.get(legChain[li + 1]);
                        legBoneLengths.push(a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0);
                    }

                    // Solve: move hip to newHipPos, ankle stays fixed.
                    const legResult = solveFABRIK(
                        legChain,
                        initialPositions,
                        newHipPos,
                        10,
                        undefined,
                        undefined,
                        legBoneLengths,
                    );
                    legResult.forEach((pos, idx) => {
                        if (!chainSet2.has(idx)) ikResult.set(idx, pos);
                    });
                }

                preservePelvisWidth(ikResult, initialPositions);
            }

            // ── Group rigid propagation ─────────────────────────────────────────
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
        [ikMetas, tryHit, updateCursor],
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

    const clearPins = useCallback(() => {
        setPinnedJoints((prev) => prev.map(() => new Set<number>()));
    }, []);

    // ── Double-click: toggle a joint as a pinned anchor ───────────────────────
    const onDoubleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!showPoseRef.current) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const cssX = e.clientX - rect.left;
            const cssY = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;

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

            setPinnedJoints((prev) => {
                const next = [...prev];
                const updated = new Set(next[bestSourceIndex]);
                if (updated.has(bestLandmarkIndex)) {
                    updated.delete(bestLandmarkIndex);
                } else {
                    updated.add(bestLandmarkIndex);
                }
                next[bestSourceIndex] = updated;
                return next;
            });
        },
        [tryHit],
    );

    const hasOverrides = overrides.some((ov) => ov !== null && ov.size > 0);

    return {
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
        clearPins,
    };
}
