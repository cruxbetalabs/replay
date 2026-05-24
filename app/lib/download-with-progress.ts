export interface DownloadProgress {
    progress: number;
    loaded: number;
    total: number | null;
}

export function formatDownloadBytes(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDownloadProgress(update: Pick<DownloadProgress, 'progress' | 'loaded' | 'total'>): string {
    if (update.total && update.total > 0) {
        return `${formatDownloadBytes(update.loaded)} / ${formatDownloadBytes(update.total)} · ${Math.round(update.progress * 100)}%`;
    }
    if (update.loaded > 0) {
        return formatDownloadBytes(update.loaded);
    }
    return `${Math.round(update.progress * 100)}%`;
}

export function downloadUrlWithProgress(
    url: string,
    responseType: 'blob' | 'text',
    onProgress?: (update: DownloadProgress) => void,
): Promise<Blob | string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = responseType;

        const reportProgress = (loaded: number, total: number | null) => {
            if (!onProgress) {
                return;
            }
            const progress = total && total > 0
                ? Math.min(loaded / total, 1)
                : loaded > 0
                    ? 0
                    : 0;
            onProgress({ progress, loaded, total });
        };

        xhr.onprogress = (event) => {
            if (!onProgress) {
                return;
            }
            reportProgress(event.loaded, event.lengthComputable && event.total > 0 ? event.total : null);
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const loaded = xhr.response instanceof Blob
                    ? xhr.response.size
                    : typeof xhr.response === 'string'
                        ? new Blob([xhr.response]).size
                        : 0;
                onProgress?.({ progress: 1, loaded, total: loaded || null });
                resolve(xhr.response as Blob | string);
                return;
            }
            reject(new Error(`Download failed (${xhr.status})`));
        };

        xhr.onerror = () => reject(new Error('Download failed due to a network error.'));
        xhr.send();
    });
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
