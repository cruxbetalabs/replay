import type { CloudJobStatus, CloudUploadPhase } from '../../lib/replay-cloud/types';

export function formatCloudFileSize(bytes: number | null): string {
    if (bytes === null || bytes <= 0) {
        return '—';
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCloudDuration(seconds: number | null): string {
    if (seconds === null || !Number.isFinite(seconds)) {
        return '—';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
}

export function formatCloudJobStatus(status: CloudJobStatus): string {
    switch (status) {
        case 'created':
        case 'queued':
            return 'Queued';
        case 'validating':
            return 'Validating';
        case 'transcoding':
            return 'Transcoding';
        case 'processing':
            return 'Processing';
        case 'ready':
            return 'Ready';
        case 'failed':
            return 'Failed';
    }
}

export function formatCloudUploadPhase(phase: CloudUploadPhase): string {
    switch (phase) {
        case 'idle':
            return 'Waiting';
        case 'probing':
            return 'Reading video…';
        case 'creating':
            return 'Creating upload…';
        case 'uploading':
            return 'Uploading…';
        case 'completing':
            return 'Finalizing upload…';
        case 'processing':
            return 'Processing in cloud…';
        case 'ready':
            return 'Ready';
        case 'failed':
            return 'Failed';
    }
}

export function isCloudJobProcessing(status: CloudJobStatus): boolean {
    return status === 'created'
        || status === 'queued'
        || status === 'validating'
        || status === 'transcoding'
        || status === 'processing';
}

export function formatCloudUploadedAt(iso8601: string): string | null {
    const date = new Date(iso8601);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMinutes < 1) {
        return 'Uploaded just now';
    }
    if (diffMinutes < 60) {
        return `Uploaded ${diffMinutes}m ago`;
    }
    if (diffHours < 24) {
        return `Uploaded ${diffHours}h ago`;
    }
    if (diffDays === 1) {
        return 'Uploaded yesterday';
    }
    if (diffDays < 7) {
        return `Uploaded ${diffDays}d ago`;
    }

    const formatted = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);

    return `Uploaded ${formatted}`;
}
