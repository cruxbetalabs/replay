'use client';

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 767;

type UnsupportedReason = 'mobile' | 'portrait';

interface ViewportState {
    supported: boolean;
    reason: UnsupportedReason | null;
}

function getViewportState(): ViewportState {
    const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
    if (isMobile) return { supported: false, reason: 'mobile' };

    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    if (isPortrait) return { supported: false, reason: 'portrait' };

    return { supported: true, reason: null };
}

export function useViewportSupported(): ViewportState | null {
    const [state, setState] = useState<ViewportState | null>(null);

    useEffect(() => {
        const update = () => setState(getViewportState());

        update();

        const mqlSize = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
        const mqlOrientation = window.matchMedia('(orientation: portrait)');

        mqlSize.addEventListener('change', update);
        mqlOrientation.addEventListener('change', update);

        return () => {
            mqlSize.removeEventListener('change', update);
            mqlOrientation.removeEventListener('change', update);
        };
    }, []);

    return state;
}
