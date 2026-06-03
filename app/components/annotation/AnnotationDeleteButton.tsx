'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { Trash2 } from 'lucide-react';
import { track, useEditor } from 'tldraw';
import { StageAnnotationClearConfirm } from './StageAnnotationClearConfirm';

const DELETE_BUTTON_CLASS = [
    'inline-flex size-8 items-center justify-center rounded-md border border-white/15',
    'bg-black/55 text-white/80 shadow-lg backdrop-blur-sm transition-colors',
    'hover:bg-red-500/30 hover:text-white',
    'disabled:cursor-not-allowed disabled:opacity-40',
].join(' ');

interface AnnotationDeleteButtonProps {
    confirmContainerRef: RefObject<HTMLDivElement | null>;
}

export const AnnotationDeleteButton = track(function AnnotationDeleteButton({
    confirmContainerRef,
}: AnnotationDeleteButtonProps) {
    const editor = useEditor();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const shapeIds = editor.getCurrentPageShapeIds();
    const hasAnnotations = shapeIds.size > 0;

    const handleConfirmDelete = () => {
        const ids = editor.getCurrentPageShapeIds();
        if (ids.size === 0) {
            setConfirmOpen(false);
            return;
        }

        editor.selectNone();
        editor.deleteShapes([...ids]);
        setConfirmOpen(false);
    };

    return (
        <>
            <button
                type="button"
                className={DELETE_BUTTON_CLASS}
                aria-label="Delete all annotations"
                aria-expanded={confirmOpen}
                disabled={!hasAnnotations}
                onClick={() => setConfirmOpen(true)}
            >
                <Trash2 className="size-4" />
            </button>

            {confirmOpen && hasAnnotations && confirmContainerRef.current && createPortal(
                <StageAnnotationClearConfirm
                    annotationCount={shapeIds.size}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setConfirmOpen(false)}
                />,
                confirmContainerRef.current,
            )}
        </>
    );
});
