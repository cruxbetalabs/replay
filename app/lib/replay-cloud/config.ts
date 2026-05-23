export function getReplayCloudApiUrl(): string | null {
    const url = process.env.NEXT_PUBLIC_REPLAY_CLOUD_API_URL?.trim();
    if (!url) {
        return null;
    }
    return url.replace(/\/$/, '');
}

export function isReplayCloudEnabled(): boolean {
    return getReplayCloudApiUrl() !== null;
}
