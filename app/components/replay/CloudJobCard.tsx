'use client';

import { useState } from 'react';
import { Loader2, Ellipsis, Plus, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VideoIndex } from '../../lib/key-moments';
import type { CloudJobDragSource } from '../../lib/replay-cloud/drag';
import { CLOUD_JOB_DRAG_MIME } from '../../lib/replay-cloud/drag';
import type { CloudJobSummary } from '../../lib/replay-cloud/types';
import { useCloudJobDragOptional } from './CloudJobDragContext';
import { attachCloudJobDragPreview, removeCloudJobDragPreview } from './create-cloud-job-drag-preview';
import {
    formatCloudDuration,
    formatCloudFileSize,
    formatCloudJobStatus,
    formatCloudUploadedAt,
    isCloudJobProcessing,
} from './cloud-job-utils';

interface CloudJobCardActionsProps {
    disabled?: boolean;
    showAddMenu?: boolean;
    showDownloadMetadata?: boolean;
    onAddLeft: () => void;
    onAddRight: () => void;
    onDownloadMetadata?: () => void;
    onDelete: () => void;
}

function CloudJobCardActions({
    disabled = false,
    showAddMenu = true,
    showDownloadMetadata = false,
    onAddLeft,
    onAddRight,
    onDownloadMetadata,
    onDelete,
}: CloudJobCardActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    disabled={disabled}
                    aria-label="Upload actions"
                >
                    <Ellipsis className="size-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 w-auto">
                {showAddMenu && (
                    <>
                        <DropdownMenuItem
                            disabled={disabled}
                            className="whitespace-nowrap"
                            onSelect={() => onAddLeft()}
                        >
                            <Plus className="size-3.5" />
                            Add to the left side
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled={disabled}
                            className="whitespace-nowrap"
                            onSelect={() => onAddRight()}
                        >
                            <Plus className="size-3.5" />
                            Add to the right side
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                {showDownloadMetadata && onDownloadMetadata && (
                    <>
                        <DropdownMenuItem
                            disabled={disabled}
                            className="whitespace-nowrap"
                            onSelect={() => onDownloadMetadata()}
                        >
                            <Download className="size-3.5" />
                            Download metadata JSON
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuItem
                    variant="destructive"
                    disabled={disabled}
                    className="whitespace-nowrap"
                    onSelect={() => onDelete()}
                >
                    <Trash2 className="size-3.5" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function CloudJobStatus({ job }: { job: CloudJobSummary }) {
    const isReady = job.status === 'ready';
    const isFailed = job.status === 'failed';
    const isProcessing = isCloudJobProcessing(job.status);

    return (
        <p className={[
            'text-xs font-medium',
            isReady && 'text-green-600 dark:text-green-400',
            isFailed && 'text-red-600 dark:text-red-400',
            isProcessing && 'text-blue-600 dark:text-blue-400',
        ].filter(Boolean).join(' ')}>
            {isProcessing && <Loader2 className="mr-1 inline size-3 animate-spin" />}
            {formatCloudJobStatus(job.status)}
        </p>
    );
}

interface CloudJobCardProps {
    job: CloudJobSummary;
    disabled?: boolean;
    dragSource?: CloudJobDragSource;
    onLoad: (jobId: string, videoIndex: VideoIndex) => void;
    onDownloadMetadata?: (jobId: string) => Promise<void>;
    onDelete: (jobId: string) => Promise<void>;
}

export function CloudJobCard({
    job,
    disabled = false,
    dragSource,
    onLoad,
    onDownloadMetadata,
    onDelete,
}: CloudJobCardProps) {
    const cloudJobDrag = useCloudJobDragOptional();
    const [isDragging, setIsDragging] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const uploadedLabel = formatCloudUploadedAt(job.created_at);
    const isReady = job.status === 'ready';
    const isFailed = job.status === 'failed';
    const isCardDisabled = disabled || isDeleting;
    const isDraggable = isReady && !isCardDisabled && dragSource !== undefined && cloudJobDrag !== null;

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete(job.job_id);
            setDeleteDialogOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteDialogOpenChange = (open: boolean) => {
        if (!isDeleting) {
            setDeleteDialogOpen(open);
        }
    };

    const handleDragStart = (event: React.DragEvent<HTMLLIElement>) => {
        if (!isDraggable || !dragSource || !cloudJobDrag) {
            return;
        }
        if ((event.target as HTMLElement).closest('button')) {
            event.preventDefault();
            return;
        }

        event.dataTransfer.setData(CLOUD_JOB_DRAG_MIME, job.job_id);
        event.dataTransfer.setData('text/plain', job.job_id);
        event.dataTransfer.effectAllowed = 'copy';
        attachCloudJobDragPreview(event, job, dragSource);
        cloudJobDrag.beginDrag(dragSource, job.job_id);
        window.requestAnimationFrame(() => setIsDragging(true));
    };

    const handleDragEnd = (event: React.DragEvent<HTMLLIElement>) => {
        setIsDragging(false);
        removeCloudJobDragPreview();
        if (dragSource === 'dialog') {
            return;
        }
        cloudJobDrag?.endDrag(event.dataTransfer.dropEffect);
    };

    const dragRingClass = isDragging && dragSource === 'sidebar'
        ? 'opacity-60 ring-2 ring-blue-300 dark:ring-blue-600'
        : isDragging && dragSource === 'dialog'
            ? 'opacity-60 ring-2 ring-violet-300 dark:ring-violet-600'
            : '';

    return (
        <li
            draggable={isDraggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={[
                'rounded-md border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900',
                isDraggable ? 'cursor-grab active:cursor-grabbing' : '',
                dragRingClass,
            ].join(' ')}
        >
            <div className="flex gap-2">
                <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                        {job.original_filename}
                    </p>
                    <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            {formatCloudDuration(job.duration_seconds)} · {formatCloudFileSize(job.file_size_bytes)}
                        </p>
                        {uploadedLabel && (
                            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                {uploadedLabel}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
                    <CloudJobCardActions
                        disabled={isCardDisabled}
                        showAddMenu={isReady}
                        showDownloadMetadata={isReady && onDownloadMetadata !== undefined}
                        onAddLeft={() => onLoad(job.job_id, 0)}
                        onAddRight={() => onLoad(job.job_id, 1)}
                        onDownloadMetadata={onDownloadMetadata ? () => void onDownloadMetadata(job.job_id) : undefined}
                        onDelete={() => setDeleteDialogOpen(true)}
                    />
                    <CloudJobStatus job={job} />
                </div>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete upload?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-medium text-foreground">{job.original_filename}</span>
                            {' '}will be permanently removed from Replay Cloud. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={() => void handleConfirmDelete()}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="size-3.5 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {isFailed && job.error_message && (
                <p className="mt-2 text-[11px] leading-snug text-red-500/90">
                    {job.error_message}
                </p>
            )}
        </li>
    );
}
