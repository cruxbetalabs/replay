'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { useEditor } from 'tldraw';
import { AnnotationToolbar } from './AnnotationToolbar';

interface AnnotationToolbarPortalProps {
    containerRef: RefObject<HTMLDivElement | null>;
    stageWidth: number;
    stageHeight: number;
}

export function AnnotationToolbarPortal({ containerRef, stageWidth, stageHeight }: AnnotationToolbarPortalProps) {
    const editor = useEditor();
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        setContainer(containerRef.current);
    }, [containerRef, editor]);

    if (!container) {
        return null;
    }

    return createPortal(
        <AnnotationToolbar stageWidth={stageWidth} stageHeight={stageHeight} />,
        container,
    );
}
