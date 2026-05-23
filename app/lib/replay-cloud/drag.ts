export const CLOUD_JOB_DRAG_MIME = 'application/x-replay-cloud-job';

export type CloudJobDragSource = 'sidebar' | 'dialog';

export function hasCloudJobDrag(dataTransfer: DataTransfer): boolean {
    return dataTransfer.types.includes(CLOUD_JOB_DRAG_MIME);
}

export function readCloudJobDragId(dataTransfer: DataTransfer): string | null {
    const jobId = dataTransfer.getData(CLOUD_JOB_DRAG_MIME);
    if (jobId) {
        return jobId;
    }
    const plain = dataTransfer.getData('text/plain');
    return plain || null;
}
