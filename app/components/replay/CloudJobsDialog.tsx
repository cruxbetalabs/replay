'use client';

import { useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { VideoIndex } from '../../lib/key-moments';
import type { CloudJobSummary } from '../../lib/replay-cloud/types';
import { CloudJobCard } from './CloudJobCard';
import { useCloudJobDragOptional } from './CloudJobDragContext';

interface CloudJobsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobs: CloudJobSummary[];
    isBootstrapped: boolean;
    onRefresh: () => void;
    onLoadJob: (jobId: string, videoIndex: VideoIndex) => Promise<void>;
    onDeleteJob: (jobId: string) => Promise<void>;
    isLoadingCloudJob?: boolean;
}

export function CloudJobsDialog({
    open,
    onOpenChange,
    jobs,
    isBootstrapped,
    onRefresh,
    onLoadJob,
    onDeleteJob,
    isLoadingCloudJob = false,
}: CloudJobsDialogProps) {
    const cloudJobDrag = useCloudJobDragOptional();

    useEffect(() => {
        if (!cloudJobDrag) {
            return;
        }
        cloudJobDrag.registerCloudDialogControl({
            close: () => onOpenChange(false),
            reopen: () => onOpenChange(true),
        });
    }, [cloudJobDrag, onOpenChange]);

    const handleLoad = useCallback(async (jobId: string, videoIndex: VideoIndex) => {
        await onLoadJob(jobId, videoIndex);
        onOpenChange(false);
    }, [onLoadJob, onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Cloud uploads</DialogTitle>
                    <DialogDescription>
                        Videos processed in Replay Cloud. Drag a ready upload onto Video 1 or 2, or use the menu to load it.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {!isBootstrapped ? 'Connecting…' : `${jobs.length} upload${jobs.length === 1 ? '' : 's'}`}
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!isBootstrapped}
                        onClick={onRefresh}
                    >
                        <RefreshCw className="size-3.5" />
                        Refresh
                    </Button>
                </div>

                {jobs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        No cloud uploads yet. Use the sidebar to upload a video.
                    </p>
                ) : (
                    <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {jobs.map((job) => (
                            <CloudJobCard
                                key={job.job_id}
                                job={job}
                                dragSource="dialog"
                                disabled={isLoadingCloudJob}
                                onLoad={(jobId, videoIndex) => void handleLoad(jobId, videoIndex)}
                                onDelete={onDeleteJob}
                            />
                        ))}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    );
}
