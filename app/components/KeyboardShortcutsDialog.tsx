'use client';

import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

interface KeyboardShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Keyboard Shortcuts"
            description="All available keyboard shortcuts"
            showCloseButton
        >
            <Command>
                <CommandInput placeholder="Search shortcuts…" />
                <CommandList className="max-h-96">
                    <CommandEmpty>No shortcuts found.</CommandEmpty>

                    <CommandGroup heading="Navigation">
                        <CommandItem>
                            <span className="flex-1">Switch to Split View</span>
                            <Kbd>,</Kbd>
                        </CommandItem>
                        <CommandItem>
                            <span className="flex-1">Switch to Overlay View</span>
                            <Kbd>.</Kbd>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Overlays">
                        <CommandItem>
                            <span className="flex-1">Toggle pose overlay</span>
                            <Kbd>[</Kbd>
                        </CommandItem>
                        <CommandItem>
                            <span className="flex-1">Toggle trajectory overlay</span>
                            <Kbd>]</Kbd>
                        </CommandItem>
                        <CommandItem>
                            <span className="flex-1">Reset pose</span>
                            <Kbd>\</Kbd>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Key Moments">
                        <CommandItem>
                            <span className="flex-1">Add key moment</span>
                            <Kbd>N</Kbd>
                        </CommandItem>
                        <CommandItem>
                            <span className="flex-1">Jump to key moment 1–9</span>
                            <KbdGroup>
                                <Kbd>1</Kbd>
                                <span className="text-xs text-muted-foreground">–</span>
                                <Kbd>9</Kbd>
                            </KbdGroup>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    );
}
