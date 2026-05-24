'use client';

import { CheckCircle2, FileJson2, FileVideo, Loader2, XCircle } from 'lucide-react';
import { formatDownloadProgress } from '../../lib/download-with-progress';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type PresetLoadFileRow = {
    key: string;
    fileName: string;
    kind: 'video' | 'metadata' | 'keymoments';
    status: 'loading' | 'success' | 'error';
    error?: string;
    progress?: number;
    loadedBytes?: number;
    totalBytes?: number | null;
};

interface PresetLoadingDialogProps {
    open: boolean;
    presetLabel: string;
    rows: PresetLoadFileRow[];
    onClose: () => void;
    loadingDescription?: string;
    successDescription?: string;
    errorDescription?: string;
}

export function PresetLoadingDialog({
    open,
    presetLabel,
    rows,
    onClose,
    loadingDescription = 'Fetching files…',
    successDescription = 'All files loaded successfully.',
    errorDescription = 'Some files could not be loaded.',
}: PresetLoadingDialogProps) {
    const isLoading = rows.some((r) => r.status === 'loading');
    const hasError = rows.some((r) => r.status === 'error');

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v && !isLoading) onClose(); }}>
            <DialogContent
                className="sm:max-w-md"
                showCloseButton={!isLoading}
                onEscapeKeyDown={(e) => { if (isLoading) e.preventDefault(); }}
                onPointerDownOutside={(e) => { if (isLoading) e.preventDefault(); }}
            >
                <DialogHeader>
                    <DialogTitle>{presetLabel}</DialogTitle>
                    <DialogDescription>
                        {isLoading
                            ? loadingDescription
                            : hasError
                                ? errorDescription
                                : successDescription}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                    {rows.map((row) => (
                        <div
                            key={row.key}
                            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
                        >
                            {row.kind === 'video' ? (
                                <FileVideo className="h-4 w-4 shrink-0 text-gray-400" />
                            ) : (
                                <FileJson2 className="h-4 w-4 shrink-0 text-gray-400" />
                            )}
                            <span className="flex-1 truncate text-xs font-medium text-gray-700">
                                {row.fileName}
                            </span>
                            {row.status === 'loading' && (
                                <div className="flex shrink-0 items-center gap-2">
                                    {typeof row.progress === 'number' && (
                                        <span className="text-xs tabular-nums text-gray-400">
                                            {formatDownloadProgress({
                                                progress: row.progress,
                                                loaded: row.loadedBytes ?? 0,
                                                total: row.totalBytes ?? null,
                                            })}
                                        </span>
                                    )}
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
                                </div>
                            )}
                            {row.status === 'success' && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                            )}
                            {row.status === 'error' && (
                                <XCircle
                                    className="h-4 w-4 shrink-0 text-red-500"
                                    aria-label={row.error}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {hasError && !isLoading && (
                    <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                        Some files failed to load. Try loading the example again.
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
