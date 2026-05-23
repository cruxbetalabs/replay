export type CloudJobStatus =
    | 'created'
    | 'queued'
    | 'validating'
    | 'transcoding'
    | 'processing'
    | 'ready'
    | 'failed';

export interface CloudJobSummary {
    job_id: string;
    status: CloudJobStatus;
    original_filename: string;
    duration_seconds: number | null;
    file_size_bytes: number | null;
    created_at: string;
    expires_at: string;
    error_message: string | null;
}

export interface CreateCloudJobResponse {
    job_id: string;
    upload_url: string;
    upload_headers: Record<string, string>;
    expires_at: string;
}

export interface CloudJobAssetsResponse {
    video_url: string;
    metadata_url: string;
    expires_in_seconds: number;
}

export type CloudUploadPhase =
    | 'idle'
    | 'probing'
    | 'creating'
    | 'uploading'
    | 'completing'
    | 'processing'
    | 'ready'
    | 'failed';

export interface ActiveCloudUpload {
    jobId: string;
    filename: string;
    phase: CloudUploadPhase;
    uploadProgress: number;
    error: string | null;
}
