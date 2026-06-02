'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { useEditor } from 'tldraw';
import { AnnotationToolbar } from './AnnotationToolbar';

interface AnnotationToolbarPortalProps {
    containerRef: RefObject<HTMLDivElement | null>;
}

export function AnnotationToolbarPortal({ containerRef }: AnnotationToolbarPortalProps) {
    const editor = useEditor();
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        setContainer(containerRef.current);
    }, [containerRef, editor]);

    if (!container) {
        return null;
    }

    return createPortal(<AnnotationToolbar />, container);
}
