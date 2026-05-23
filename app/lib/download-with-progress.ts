export function downloadUrlWithProgress(
    url: string,
    responseType: 'blob' | 'text',
    onProgress?: (progress: number) => void,
): Promise<Blob | string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = responseType;

        xhr.onprogress = (event) => {
            if (!onProgress || !event.lengthComputable || event.total <= 0) {
                return;
            }
            onProgress(Math.min(event.loaded / event.total, 1));
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress?.(1);
                resolve(xhr.response as Blob | string);
                return;
            }
            reject(new Error(`Download failed (${xhr.status})`));
        };

        xhr.onerror = () => reject(new Error('Download failed due to a network error.'));
        xhr.send();
    });
}
