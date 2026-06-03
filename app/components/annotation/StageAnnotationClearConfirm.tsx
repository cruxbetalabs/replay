'use client';

import { X } from 'lucide-react';

interface StageAnnotationClearConfirmProps {
    annotationCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export function StageAnnotationClearConfirm({
    annotationCount,
    onConfirm,
    onCancel,
}: StageAnnotationClearConfirmProps) {
    const label = annotationCount === 1
        ? '1 annotation'
        : `${annotationCount} annotations`;

    return (
        <div className="pointer-events-auto absolute inset-x-3 top-3 z-50 rounded-xl border border-white/10 bg-black/55 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
                    Delete annotations
                </p>
                <button
                    type="button"
                    onClick={onCancel}
                    className="shrink-0 rounded p-0.5 text-white/30 transition-colors hover:text-white/70"
                    aria-label="Dismiss"
                >
                    <X className="size-3.5" />
                </button>
            </div>
            <div className="px-4 pb-4">
                <p className="text-xs font-medium text-white/85">
                    Delete {label} on this video?
                </p>
                <p className="mt-1 text-xs leading-snug text-white/45">
                    This cannot be undone.
                </p>
                <div className="mt-3 flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 rounded-lg border border-white/15 py-2 text-xs font-medium text-white/65 transition-colors hover:bg-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 rounded-lg bg-red-500/90 py-2 text-xs font-medium text-white transition-colors hover:bg-red-500"
                    >
                        Delete all
                    </button>
                </div>
            </div>
        </div>
    );
}
