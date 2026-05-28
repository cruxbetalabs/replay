'use client';

import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { MenubarShortcut } from '@/components/ui/menubar';
import { formatAltShortcut, getAltKeyLabel } from '../lib/keyboard-shortcut-labels';

interface AltKeyShortcutLabelProps {
    keyLetter: string;
    variant?: 'kbd' | 'menubar';
}

export function AltKeyShortcutLabel({ keyLetter, variant = 'kbd' }: AltKeyShortcutLabelProps) {
    const letter = keyLetter.length === 1 ? keyLetter.toUpperCase() : keyLetter;
    const altLabel = getAltKeyLabel();
    const menubarShortcut = formatAltShortcut(keyLetter);

    if (variant === 'menubar') {
        return <MenubarShortcut>{menubarShortcut}</MenubarShortcut>;
    }

    return (
        <KbdGroup>
            <Kbd>{altLabel}</Kbd>
            <Kbd>{letter}</Kbd>
        </KbdGroup>
    );
}
