'use client';

import { useEffect, useRef } from 'react';

export interface KeyboardShortcut {
    key: string;
    onTrigger: () => void;
    enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
    shortcuts: KeyboardShortcut[];
    enabled?: boolean;
}

const isTypingTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return true;
    }

    if (target instanceof HTMLInputElement) {
        return !['range', 'button', 'checkbox', 'radio', 'file', 'submit'].includes(target.type);
    }

    return false;
};

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
    const shortcutsRef = useRef(shortcuts);

    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
                return;
            }

            if (isTypingTarget(event.target)) {
                return;
            }

            const matchedShortcut = shortcutsRef.current.find((shortcut) => {
                return (shortcut.enabled ?? true) && shortcut.key === event.key;
            });

            if (!matchedShortcut) {
                return;
            }

            event.preventDefault();
            matchedShortcut.onTrigger();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled]);
}