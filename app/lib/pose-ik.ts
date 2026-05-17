import type { PoseFrame, PoseLandmark, TrajectoryMetadata } from './trajectory-types';

export type Pos2D = { x: number; y: number };

// ---------------------------------------------------------------------------
// Skeleton graph
// ---------------------------------------------------------------------------

export function buildAdjacencyMap(connections: [number, number][]): Map<number, number[]> {
    const map = new Map<number, number[]>();
    for (const [a, b] of connections) {
        if (!map.has(a)) map.set(a, []);
        if (!map.has(b)) map.set(b, []);
        map.get(a)!.push(b);
        map.get(b)!.push(a);
    }
    return map;
}

/**
 * Returns the indices of the `topN` most-connected landmarks. These are used
 * as IK anchors – for standard pose models the hip joints have the highest
 * degree and act as a natural stable pelvis root.
 */
export function findAnchorLandmarks(connections: [number, number][], topN = 2): Set<number> {
    const degree = new Map<number, number>();
    for (const [a, b] of connections) {
        degree.set(a, (degree.get(a) ?? 0) + 1);
        degree.set(b, (degree.get(b) ?? 0) + 1);
    }
    return new Set(
        Array.from(degree.entries())
            .sort((x, y) => y[1] - x[1])
            .slice(0, topN)
            .map(([idx]) => idx),
    );
}

/**
 * BFS from `startIndex` outward until an anchor is reached.
 * Returns the ordered chain [startIndex, …, anchorIndex].
 * If the start is itself an anchor the chain is just [startIndex].
 */
export function findChainToAnchor(
    graph: Map<number, number[]>,
    startIndex: number,
    anchors: Set<number>,
): number[] | null {
    if (anchors.has(startIndex)) return [startIndex];
    const visited = new Set<number>([startIndex]);
    const queue: Array<{ index: number; path: number[] }> = [
        { index: startIndex, path: [startIndex] },
    ];
    while (queue.length > 0) {
        const item = queue.shift()!;
        for (const neighbor of graph.get(item.index) ?? []) {
            if (visited.has(neighbor)) continue;
            const newPath = [...item.path, neighbor];
            if (anchors.has(neighbor)) return newPath;
            visited.add(neighbor);
            queue.push({ index: neighbor, path: newPath });
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// FABRIK 2D solver
// ---------------------------------------------------------------------------

/**
 * Forward And Backward Reaching IK (2D).
 *
 * `chain[0]`    = end-effector (the dragged joint).
 * `chain[last]` = anchor (fixed – does NOT move).
 *
 * `initialPositions` should be the pose's positions at the moment the drag
 * started so bone lengths remain constant throughout the gesture.
 *
 * Returns a Map of `landmarkIndex → newPos` for every non-anchor joint in
 * the chain. The anchor is intentionally excluded from the result.
 */
export function solveFABRIK(
    chain: number[],
    initialPositions: Map<number, Pos2D>,
    targetPos: Pos2D,
    iterations = 10,
    initialZ?: Map<number, number | null>,
): Map<number, Pos2D> {
    if (chain.length === 0) return new Map();

    // Single joint (dragged joint IS the anchor) – move it directly.
    if (chain.length === 1) {
        return new Map([[chain[0], { x: targetPos.x, y: targetPos.y }]]);
    }

    // Working copy of positions along the chain.
    const positions: Pos2D[] = chain.map((idx) => {
        const p = initialPositions.get(idx);
        return p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
    });

    // Bone lengths are frozen from the initial pose so they don't drift.
    // When z values are available, use 3D distance for a better length estimate.
    const boneLengths = chain.slice(0, -1).map((_, i) => {
        const a = positions[i];
        const b = positions[i + 1];
        const zA = initialZ?.get(chain[i]) ?? null;
        const zB = initialZ?.get(chain[i + 1]) ?? null;
        if (zA != null && zB != null) {
            return Math.hypot(b.x - a.x, b.y - a.y, zB - zA);
        }
        return Math.hypot(b.x - a.x, b.y - a.y);
    });

    const anchor: Pos2D = { ...positions[positions.length - 1] };

    for (let iter = 0; iter < iterations; iter++) {
        // ── Forward pass: pull end-effector to target, drag chain behind it ──
        positions[0] = { x: targetPos.x, y: targetPos.y };
        for (let i = 1; i < positions.length; i++) {
            const prev = positions[i - 1];
            const curr = positions[i];
            const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
            if (dist < 1e-6) continue;
            const ratio = boneLengths[i - 1] / dist;
            positions[i] = {
                x: prev.x + (curr.x - prev.x) * ratio,
                y: prev.y + (curr.y - prev.y) * ratio,
            };
        }

        // ── Backward pass: restore anchor, push back toward end-effector ──
        positions[positions.length - 1] = { ...anchor };
        for (let i = positions.length - 2; i >= 0; i--) {
            const next = positions[i + 1];
            const curr = positions[i];
            const dist = Math.hypot(curr.x - next.x, curr.y - next.y);
            if (dist < 1e-6) continue;
            const ratio = boneLengths[i] / dist;
            positions[i] = {
                x: next.x + (curr.x - next.x) * ratio,
                y: next.y + (curr.y - next.y) * ratio,
            };
        }
    }

    const result = new Map<number, Pos2D>();
    chain.forEach((idx, i) => {
        // Exclude the anchor (last element) from the result.
        if (i < chain.length - 1) {
            result.set(idx, positions[i]);
        }
    });
    return result;
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

/**
 * Returns the index of the nearest landmark whose distance to (poseX, poseY)
 * is within `threshold` (in pose coordinate space), or null if none.
 */
export function hitTestLandmark(
    landmarks: (PoseLandmark | null)[],
    poseX: number,
    poseY: number,
    threshold: number,
): number | null {
    let bestIndex: number | null = null;
    let bestDist = threshold;
    for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        if (!lm) continue;
        const dist = Math.hypot(lm.x - poseX, lm.y - poseY);
        if (dist < bestDist) {
            bestDist = dist;
            bestIndex = i;
        }
    }
    return bestIndex;
}

// ---------------------------------------------------------------------------
// Coordinate utilities (mirrors the math inside TrajectoryOverlay)
// ---------------------------------------------------------------------------

export function getContainedRect(
    containerWidth: number,
    containerHeight: number,
    sourceWidth: number,
    sourceHeight: number,
): { x: number; y: number; width: number; height: number } {
    if (containerWidth <= 0 || containerHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    const containerAspect = containerWidth / containerHeight;
    const sourceAspect = sourceWidth / sourceHeight;
    if (sourceAspect > containerAspect) {
        const width = containerWidth;
        const height = width / sourceAspect;
        return { x: 0, y: (containerHeight - height) / 2, width, height };
    }
    const height = containerHeight;
    const width = height * sourceAspect;
    return { x: (containerWidth - width) / 2, y: 0, width, height };
}

/** Convert a CSS-pixel offset within the stage container to pose coordinate space. */
export function cssToPoseCoords(
    cssX: number,
    cssY: number,
    containerWidth: number,
    containerHeight: number,
    metadata: TrajectoryMetadata,
): Pos2D | null {
    if (!metadata.pose) return null;
    const videoRect = getContainedRect(
        containerWidth,
        containerHeight,
        metadata.sourceVideo.width,
        metadata.sourceVideo.height,
    );
    const poseScaleX = videoRect.width / metadata.pose.coordinateSpace.width;
    const poseScaleY = videoRect.height / metadata.pose.coordinateSpace.height;
    if (poseScaleX <= 0 || poseScaleY <= 0) return null;
    return {
        x: (cssX - videoRect.x) / poseScaleX,
        y: (cssY - videoRect.y) / poseScaleY,
    };
}

/**
 * Convert a CSS-pixel hit-test radius into the equivalent distance in pose
 * coordinate space. Used to compute the landmark hit threshold.
 */
export function cssPixelsToPoseUnits(
    px: number,
    containerWidth: number,
    containerHeight: number,
    metadata: TrajectoryMetadata,
): number {
    if (!metadata.pose) return px;
    const videoRect = getContainedRect(
        containerWidth,
        containerHeight,
        metadata.sourceVideo.width,
        metadata.sourceVideo.height,
    );
    const poseScaleX = videoRect.width / metadata.pose.coordinateSpace.width;
    return poseScaleX > 0 ? px / poseScaleX : px;
}

// ---------------------------------------------------------------------------
// Frame lookup (same binary search used in TrajectoryOverlay)
// ---------------------------------------------------------------------------

export function findLastPoseFrameAtOrBefore(frames: PoseFrame[], currentTimeSec: number): number {
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
}

/**
 * Return the landmark array for the current frame with `overrides` merged in.
 * Returns null if no pose data or no frame is available yet.
 */
export function getEffectiveLandmarks(
    metadata: TrajectoryMetadata,
    currentTimeSec: number,
    overrides: Map<number, Pos2D> | null,
): (PoseLandmark | null)[] | null {
    const pose = metadata.pose;
    if (!pose) return null;
    const frameIndex = findLastPoseFrameAtOrBefore(pose.frames, currentTimeSec);
    if (frameIndex < 0) return null;
    const frame = pose.frames[frameIndex];
    if (!frame.landmarks || frame.landmarks.length !== pose.landmarkCount) return null;
    if (!overrides || overrides.size === 0) return frame.landmarks;
    return frame.landmarks.map((lm, i) => {
        const ov = overrides.get(i);
        if (!ov || !lm) return lm;
        return { ...lm, x: ov.x, y: ov.y };
    });
}

// ---------------------------------------------------------------------------
// Joint group configuration
// ---------------------------------------------------------------------------

/**
 * Facial landmark indices (MediaPipe Pose 0–10: nose, eyes, ears, mouth).
 * These landmarks are excluded from all IK interaction.
 */
export const FACE_LANDMARK_INDICES = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

/**
 * Unified joint groups. Dragging any member of a group moves the entire group
 * as a rigid unit, preserving the relative positions within the group.
 *
 * The **first element** of each group is the IK representative — its position
 * drives the kinematic chain while all other members are translated by the
 * same displacement.
 *
 *   Hands  – wrist + pinky/index/thumb distal markers (user-specified indices)
 *   Feet   – ankle + heel + foot-index markers
 */
export const JOINT_GROUPS: ReadonlyArray<readonly number[]> = [
    [16, 22, 18, 20], // "left hand"  (user-specified) — representative = 16
    [15, 21, 17, 19], // "right hand" (symmetric)      — representative = 15
    [27, 29, 31],     // left foot  — representative = 27 (ankle)
    [28, 30, 32],     // right foot — representative = 28 (ankle)
] as const;

/** Return the joint group an index belongs to, or `null` if ungrouped. */
export function getLandmarkGroup(index: number): readonly number[] | null {
    return JOINT_GROUPS.find((g) => (g as readonly number[]).includes(index)) ?? null;
}

/**
 * True when the landmark at `index` may be grabbed and dragged.
 * Facial landmarks (indices 0–10) are always excluded.
 */
export function isDraggable(index: number): boolean {
    return !FACE_LANDMARK_INDICES.has(index);
}
