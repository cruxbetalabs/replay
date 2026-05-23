import { replayCloudFetch } from './client';
import type {
    CloudJobAssetsResponse,
    CloudJobSummary,
    CreateCloudJobResponse,
} from './types';

interface JobListResponse {
    jobs: CloudJobSummary[];
}

export async function bootstrapReplayCloudClient(): Promise<void> {
    await replayCloudFetch<{ status: string }>('/clients/bootstrap', { method: 'POST' });
}

export async function createCloudJob(input: {
    filename: string;
    content_type: string;
    file_size_bytes: number;
    duration_seconds: number;
}): Promise<CreateCloudJobResponse> {
    return replayCloudFetch<CreateCloudJobResponse>('/jobs', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function completeCloudJob(jobId: string): Promise<{ job_id: string; status: string }> {
    return replayCloudFetch(`/jobs/${jobId}/complete`, { method: 'POST' });
}

export async function listCloudJobs(): Promise<CloudJobSummary[]> {
    const response = await replayCloudFetch<JobListResponse>('/jobs');
    return response.jobs;
}

export async function getCloudJob(jobId: string): Promise<CloudJobSummary> {
    return replayCloudFetch<CloudJobSummary>(`/jobs/${jobId}`);
}

export async function getCloudJobAssets(jobId: string): Promise<CloudJobAssetsResponse> {
    return replayCloudFetch<CloudJobAssetsResponse>(`/jobs/${jobId}/assets`);
}

export async function deleteCloudJob(jobId: string): Promise<void> {
    await replayCloudFetch(`/jobs/${jobId}`, { method: 'DELETE' });
}

export function uploadFileToPresignedUrl(
    uploadUrl: string,
    file: File,
    headers: Record<string, string>,
    onProgress?: (progress: number) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);

        Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
        });

        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable || !onProgress) {
                return;
            }
            onProgress(event.loaded / event.total);
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
                return;
            }
            reject(new Error(`Upload failed (${xhr.status})`));
        };

        xhr.onerror = () => reject(new Error('Upload failed due to a network error.'));
        xhr.send(file);
    });
}
