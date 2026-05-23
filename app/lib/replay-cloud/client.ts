import { getReplayCloudApiUrl } from './config';

export class ReplayCloudError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = 'ReplayCloudError';
    }
}

async function readErrorMessage(response: Response): Promise<string> {
    try {
        const payload = await response.json() as { detail?: unknown };
        if (typeof payload.detail === 'string') {
            return payload.detail;
        }
        if (payload.detail && typeof payload.detail === 'object') {
            return JSON.stringify(payload.detail);
        }
    } catch {
        // fall through
    }
    return `Request failed (${response.status})`;
}

export async function replayCloudFetch<T>(
    path: string,
    init: RequestInit = {},
): Promise<T> {
    const baseUrl = getReplayCloudApiUrl();
    if (!baseUrl) {
        throw new ReplayCloudError('Replay Cloud API is not configured.', 0);
    }

    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers,
    });

    if (!response.ok) {
        throw new ReplayCloudError(await readErrorMessage(response), response.status);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export function getReplayCloudEventsUrl(): string | null {
    const baseUrl = getReplayCloudApiUrl();
    return baseUrl ? `${baseUrl}/events` : null;
}
