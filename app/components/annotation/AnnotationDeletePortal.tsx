'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { useEditor } from 'tldraw';
import { AnnotationDeleteButton } from './AnnotationDeleteButton';

interface AnnotationDeletePortalProps {
    containerRef: RefObject<HTMLDivElement | null>;
    confirmContainerRef: RefObject<HTMLDivElement | null>;
}

export function AnnotationDeletePortal({ containerRef, confirmContainerRef }: AnnotationDeletePortalProps) {
    const editor = useEditor();
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        setContainer(containerRef.current);
    }, [containerRef, editor]);

    if (!container) {
        return null;
    }

    return createPortal(
        <AnnotationDeleteButton confirmContainerRef={confirmContainerRef} />,
        container,
    );
}
