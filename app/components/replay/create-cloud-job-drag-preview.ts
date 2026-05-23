import type { DragEvent } from 'react';
import type { CloudJobDragSource } from '../../lib/replay-cloud/drag';
import type { CloudJobSummary } from '../../lib/replay-cloud/types';
import { formatCloudDuration, formatCloudFileSize } from './cloud-job-utils';

let activePreview: HTMLElement | null = null;

export function createCloudJobDragPreview(
    job: CloudJobSummary,
    source: CloudJobDragSource,
): HTMLElement {
    const el = document.createElement('div');
    const isSidebar = source === 'sidebar';

    el.className = [
        'w-56 rounded-md border bg-white px-3 py-2.5 shadow-xl',
        isSidebar
            ? 'border-blue-300 ring-2 ring-blue-200/80'
            : 'border-violet-300 ring-2 ring-violet-200/80',
    ].join(' ');

    el.style.position = 'fixed';
    el.style.top = '-9999px';
    el.style.left = '-9999px';
    el.style.pointerEvents = 'none';

    const title = document.createElement('p');
    title.className = 'truncate text-sm font-medium text-gray-800';
    title.textContent = job.original_filename;

    const meta = document.createElement('p');
    meta.className = 'mt-1 text-xs text-gray-400';
    meta.textContent = `${formatCloudDuration(job.duration_seconds)} · ${formatCloudFileSize(job.file_size_bytes)}`;

    const badge = document.createElement('p');
    badge.className = [
        'mt-1.5 text-[10px] font-semibold uppercase tracking-wider',
        isSidebar ? 'text-blue-500' : 'text-violet-500',
    ].join(' ');
    badge.textContent = isSidebar ? 'From sidebar' : 'From cloud uploads';

    el.append(title, meta, badge);
    document.body.appendChild(el);
    return el;
}

export function attachCloudJobDragPreview(
    event: DragEvent,
    job: CloudJobSummary,
    source: CloudJobDragSource,
): void {
    activePreview?.remove();
    activePreview = createCloudJobDragPreview(job, source);
    event.dataTransfer.setDragImage(activePreview, 24, 18);
    window.requestAnimationFrame(() => {
        activePreview?.remove();
        activePreview = null;
    });
}

export function removeCloudJobDragPreview(): void {
    activePreview?.remove();
    activePreview = null;
}
