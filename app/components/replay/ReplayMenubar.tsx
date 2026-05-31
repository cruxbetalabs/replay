'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLinkIcon } from 'lucide-react';
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarShortcut,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
} from '@/components/ui/menubar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { isComparisonPreset, type PresetComparison, type PresetLoadTarget } from '../../lib/presets';
import type { VideoIndex } from '../../lib/key-moments';
import type { CloudJobSummary } from '../../lib/replay-cloud/types';
import { EMPTY_CLOUD_JOBS } from '../../lib/empty-arrays';
import { CloudJobsDialog } from './CloudJobsDialog';
import { AltKeyShortcutLabel } from '../AltKeyShortcutLabel';
import { isTypingTarget } from '../../hooks/useKeyboardShortcuts';
import { matchesAltKeyShortcut } from '../../lib/keyboard-shortcut-labels';

const GITHUB_URL = 'https://github.com/cruxbetalabs/replay';
const COMPANY_URL = 'https://cruxbeta.dev';

function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Replay</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Side-by-side video comparison with trajectory and pose overlays.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-1 pt-1">
                    <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        View on GitHub
                    </a>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface ReplayMenubarProps {
    // View
    resolvedViewMode: 'split' | 'overlay';
    hasAnyOverlayData: boolean;
    onSetViewMode: (mode: 'split' | 'overlay') => void;
    // Videos
    hasVideo1: boolean;
    hasVideo2: boolean;
    showRemoveVideos?: boolean;
    onRemoveVideo1?: () => void;
    onRemoveVideo2?: () => void;
    onRemoveAllVideos?: () => void;
    hasMetadata1?: boolean;
    hasMetadata2?: boolean;
    onRemoveMetadata1?: () => void;
    onRemoveMetadata2?: () => void;
    onRemoveAllMetadata?: () => void;
    // Help
    onOpenShortcuts: () => void;
    // Presets
    presets?: PresetComparison[];
    onLoadPreset?: (preset: PresetComparison, target: PresetLoadTarget) => void;
    // Cloud
    cloudEnabled?: boolean;
    cloudBootstrapped?: boolean;
    cloudJobs?: CloudJobSummary[];
    cloudInProgressCount?: number;
    onRefreshCloudJobs?: () => void;
    onLoadCloudJob?: (jobId: string, videoIndex: VideoIndex) => Promise<void>;
    onDownloadCloudJobMetadata?: (jobId: string) => Promise<void>;
    onDeleteCloudJob?: (jobId: string) => Promise<void>;
    isLoadingCloudJob?: boolean;
}

export function ReplayMenubar({
    resolvedViewMode,
    hasAnyOverlayData,
    onSetViewMode,
    hasVideo1,
    hasVideo2,
    showRemoveVideos = true,
    onRemoveVideo1,
    onRemoveVideo2,
    onRemoveAllVideos,
    hasMetadata1 = false,
    hasMetadata2 = false,
    onRemoveMetadata1,
    onRemoveMetadata2,
    onRemoveAllMetadata,
    onOpenShortcuts,
    presets,
    onLoadPreset,
    cloudEnabled = false,
    cloudBootstrapped = false,
    cloudJobs = EMPTY_CLOUD_JOBS,
    cloudInProgressCount = 0,
    onRefreshCloudJobs,
    onLoadCloudJob,
    onDownloadCloudJobMetadata,
    onDeleteCloudJob,
    isLoadingCloudJob = false,
}: ReplayMenubarProps) {
    const hasVideoControls = showRemoveVideos && (hasVideo1 || hasVideo2);
    const hasMetadataControls = onRemoveMetadata1 || onRemoveMetadata2 || onRemoveAllMetadata;
    const hasAnyMetadata = hasMetadata1 || hasMetadata2;
    const [aboutOpen, setAboutOpen] = useState(false);
    const [cloudJobsOpen, setCloudJobsOpen] = useState(false);
    const hasCloudMenu = cloudEnabled && onRefreshCloudJobs && onLoadCloudJob && onDeleteCloudJob;
    const { comparisonPresets, videoPresets } = useMemo(() => ({
        comparisonPresets: presets?.filter(isComparisonPreset) ?? [],
        videoPresets: presets?.filter((preset) => !isComparisonPreset(preset)) ?? [],
    }), [presets]);

    useEffect(() => {
        if (!hasCloudMenu) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target)) {
                return;
            }

            if (matchesAltKeyShortcut(event, 'KeyC')) {
                event.preventDefault();
                setCloudJobsOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasCloudMenu]);

    return (
        <>
            <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
            {hasCloudMenu && (
                <CloudJobsDialog
                    open={cloudJobsOpen}
                    onOpenChange={setCloudJobsOpen}
                    jobs={cloudJobs}
                    isBootstrapped={cloudBootstrapped}
                    onRefresh={onRefreshCloudJobs}
                    onLoadJob={onLoadCloudJob}
                    onDownloadJobMetadata={onDownloadCloudJobMetadata}
                    onDeleteJob={onDeleteCloudJob}
                    isLoadingCloudJob={isLoadingCloudJob}
                />
            )}
            <Menubar>
                {/* Replay */}
                <MenubarMenu>
                    <MenubarTrigger className="font-bold">Replay</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem onSelect={() => setAboutOpen(true)}>
                            About
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem
                            onSelect={() => window.open(COMPANY_URL, '_blank', 'noopener,noreferrer')}
                        >
                            Crux Beta Labs
                            <ExternalLinkIcon className="ml-auto size-3.5 text-muted-foreground" />
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>

                {/* Examples */}
                {presets && presets.length > 0 && onLoadPreset && (
                    <MenubarMenu>
                        <MenubarTrigger>Examples</MenubarTrigger>
                        <MenubarContent>
                            {comparisonPresets.length > 0 && (
                                <MenubarSub>
                                    <MenubarSubTrigger>Comparisons</MenubarSubTrigger>
                                    <MenubarSubContent>
                                        {comparisonPresets.map((preset) => (
                                            <MenubarItem
                                                key={preset.id}
                                                onSelect={() => onLoadPreset(preset, 'comparison')}
                                            >
                                                {preset.label}
                                            </MenubarItem>
                                        ))}
                                    </MenubarSubContent>
                                </MenubarSub>
                            )}
                            {videoPresets.length > 0 && (
                                <MenubarSub>
                                    <MenubarSubTrigger>Videos</MenubarSubTrigger>
                                    <MenubarSubContent>
                                        {videoPresets.map((preset) => (
                                            <MenubarSub key={preset.id}>
                                                <MenubarSubTrigger>{preset.label}</MenubarSubTrigger>
                                                <MenubarSubContent>
                                                    <MenubarItem onSelect={() => onLoadPreset(preset, { slot: 0 })}>
                                                        Load into Video 1 (left)
                                                    </MenubarItem>
                                                    <MenubarItem onSelect={() => onLoadPreset(preset, { slot: 1 })}>
                                                        Load into Video 2 (right)
                                                    </MenubarItem>
                                                </MenubarSubContent>
                                            </MenubarSub>
                                        ))}
                                    </MenubarSubContent>
                                </MenubarSub>
                            )}
                        </MenubarContent>
                    </MenubarMenu>
                )}

                {/* Videos */}
                {hasVideoControls && (
                    <MenubarMenu>
                        <MenubarTrigger>Videos</MenubarTrigger>
                        <MenubarContent>
                            {hasVideo1 && onRemoveVideo1 && (
                                <MenubarItem
                                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                    onSelect={onRemoveVideo1}
                                >
                                    Remove Video 1
                                </MenubarItem>
                            )}
                            {hasVideo2 && onRemoveVideo2 && (
                                <MenubarItem
                                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                    onSelect={onRemoveVideo2}
                                >
                                    Remove Video 2
                                </MenubarItem>
                            )}
                            {onRemoveAllVideos && (hasVideo1 || hasVideo2) && (
                                <>
                                    <MenubarSeparator />
                                    <MenubarItem
                                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                        onSelect={onRemoveAllVideos}
                                    >
                                        Remove all videos
                                    </MenubarItem>
                                </>
                            )}
                        </MenubarContent>
                    </MenubarMenu>
                )}

                {/* Metadata */}
                {hasMetadataControls && hasAnyMetadata && (
                    <MenubarMenu>
                        <MenubarTrigger>Metadata</MenubarTrigger>
                        <MenubarContent>
                            {hasMetadata1 && onRemoveMetadata1 && (
                                <MenubarItem
                                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                    onSelect={onRemoveMetadata1}
                                >
                                    Remove Video 1&apos;s metadata
                                </MenubarItem>
                            )}
                            {hasMetadata2 && onRemoveMetadata2 && (
                                <MenubarItem
                                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                    onSelect={onRemoveMetadata2}
                                >
                                    Remove Video 2&apos;s metadata
                                </MenubarItem>
                            )}
                            {onRemoveAllMetadata && (hasMetadata1 || hasMetadata2) && (
                                <>
                                    {(hasMetadata1 && onRemoveMetadata1) || (hasMetadata2 && onRemoveMetadata2)
                                        ? <MenubarSeparator />
                                        : null}
                                    <MenubarItem
                                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                        onSelect={onRemoveAllMetadata}
                                    >
                                        Remove all metadata
                                    </MenubarItem>
                                </>
                            )}
                        </MenubarContent>
                    </MenubarMenu>
                )}

                {/* Cloud */}
                {hasCloudMenu && (
                    <MenubarMenu>
                        <MenubarTrigger>
                            Cloud
                            {cloudInProgressCount > 0 && (
                                <span className="ml-1.5 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    {cloudInProgressCount}
                                </span>
                            )}
                        </MenubarTrigger>
                        <MenubarContent>
                            <MenubarItem onSelect={() => setCloudJobsOpen(true)}>
                                My uploads
                                <AltKeyShortcutLabel keyLetter="C" variant="menubar" />
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                )}

                {/* Help */}
                <MenubarMenu>
                    <MenubarTrigger>Help</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem onSelect={onOpenShortcuts}>
                            Keyboard Shortcuts
                            <MenubarShortcut>⌘/</MenubarShortcut>
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
            </Menubar>
        </>
    );
}
