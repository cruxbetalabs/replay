// ─── Label Taxonomy — Beta-1 schema ─────────────────────────────────────────

export const BODY_POSE_LABELS = [
    'gaston', 'flag', 'backstep', 'drop_knee', 'lockoff', 'high_step',
] as const;

export const CONTACT_TECHNIQUE_LABELS = [
    'heel_hook', 'toe_hook',
] as const;

export const MOVEMENT_LABELS = [
    'deadpoint', 'dyno', 'coordination', 'rock_over', 'match', 'campus',
] as const;

export type BodyPoseLabel = typeof BODY_POSE_LABELS[number];
export type ContactTechniqueLabel = typeof CONTACT_TECHNIQUE_LABELS[number];
export type MovementLabel = typeof MOVEMENT_LABELS[number];

export type AnnotationLabelGroup = 'bodyPose' | 'contactTechnique' | 'movement';

// ─── Annotation ──────────────────────────────────────────────────────────────

/**
 * A single annotation scoped to one video. Describes a frame range with one
 * or more labels from the Beta-1 taxonomy. Stored independently of KeyMoments.
 */
export interface Annotation {
    id: string;
    /** 0 = Video 1, 1 = Video 2. */
    videoIndex: 0 | 1;
    startTime: number;
    endTime: number;
    startFrame: number;
    endFrame: number;
    bodyPoseLabels: string[];
    contactTechniqueLabels: string[];
    movementLabels: string[];
    notes?: string;
}

// ─── Export Schema Builder (Beta-1 format) ───────────────────────────────────

export interface AnnotationExportClip {
    id: string;
    startFrame: number;
    endFrame: number;
    startTime: number;
    endTime: number;
    bodyPoseLabels: string[];
    contactTechniqueLabels: string[];
    movementLabels: string[];
    notes: string;
}

export interface AnnotationExport {
    schema: 'beta-1';
    videoId: string;
    exportedAt: string;
    annotations: AnnotationExportClip[];
}

export function buildAnnotationExport(
    videoId: string,
    videoIndex: 0 | 1,
    annotations: Annotation[],
): AnnotationExport {
    return {
        schema: 'beta-1',
        videoId,
        exportedAt: new Date().toISOString(),
        annotations: annotations
            .filter((a) => a.videoIndex === videoIndex)
            .map((a) => ({
                id: a.id,
                startFrame: a.startFrame,
                endFrame: a.endFrame,
                startTime: a.startTime,
                endTime: a.endTime,
                bodyPoseLabels: a.bodyPoseLabels,
                contactTechniqueLabels: a.contactTechniqueLabels,
                movementLabels: a.movementLabels,
                notes: a.notes ?? '',
            })),
    };
}

/** Trigger a JSON file download in the browser. */
export function downloadAnnotationExport(data: AnnotationExport): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations-${data.videoId.slice(0, 16)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
