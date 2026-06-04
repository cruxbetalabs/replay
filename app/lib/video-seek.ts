/**
 * Safari implements fastSeek() but snaps to the nearest keyframe, which often
 * means ~1s jumps for typical encodings. Chromium tolerates fastSeek during
 * coalesced scrubbing; Safari needs precise currentTime seeks for frame stepping.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/fastSeek
 */
export function isSafariBrowser(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const ua = navigator.userAgent;
    return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox/i.test(ua);
}

export function shouldUseFastSeekForScrubbing(): boolean {
    return !isSafariBrowser();
}

/** Safari decodes adjacent frames faster when more of the file is buffered. */
export function preferredVideoPreload(): 'auto' | 'metadata' {
    return isSafariBrowser() ? 'auto' : 'metadata';
}
