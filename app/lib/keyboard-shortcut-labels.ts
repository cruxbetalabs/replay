export function isMacOS(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function getAltKeyLabel(): string {
    return isMacOS() ? '⌥' : 'Alt';
}

export function formatAltShortcut(key: string): string {
    const letter = key.length === 1 ? key.toUpperCase() : key;
    return isMacOS() ? `⌥${letter}` : `Alt+${letter}`;
}

export function matchesAltKeyShortcut(event: KeyboardEvent, code: string): boolean {
    return event.altKey
        && !event.metaKey
        && !event.ctrlKey
        && !event.shiftKey
        && event.code === code;
}
