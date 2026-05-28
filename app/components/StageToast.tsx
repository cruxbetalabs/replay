'use client';

import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, Ban, CheckCircle2, X } from 'lucide-react';

const AUTO_DISMISS_MS = 5_000;

export type ProcessResult = {
    fileName: string;
    kind: 'video' | 'json' | 'unknown';
    status: 'success' | 'error' | 'warning' | 'cancelled';
    message?: string;
};

interface StageToastProps {
    results: ProcessResult[];
    onClose: () => void;
}

function ResultIcon({ status }: { status: ProcessResult['status'] }) {
    if (status === 'success') return <CheckCircle2 className="size-3.5 shrink-0 text-green-400" />;
    if (status === 'error') return <AlertCircle className="size-3.5 shrink-0 text-red-400" />;
    if (status === 'warning') return <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />;
    return <Ban className="size-3.5 shrink-0 text-white/30" />;
}

const kindLabel: Record<ProcessResult['kind'], string> = {
    video: 'Video',
    json: 'JSON',
    unknown: 'File',
};

export function StageToast({ results, onClose }: StageToastProps) {
    useEffect(() => {
        const id = setTimeout(onClose, AUTO_DISMISS_MS);
        return () => clearTimeout(id);
    }, [onClose]);

    return (
        <div className="absolute inset-x-3 top-3 z-20 rounded-xl border border-white/10 bg-black/55 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
                    Upload results
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded p-0.5 text-white/30 transition-colors hover:text-white/70"
                    aria-label="Dismiss"
                >
                    <X className="size-3.5" />
                </button>
            </div>
            <div className="space-y-1.5 px-4 pb-3.5">
                {results.map((result, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                        <div className="mt-0.5">
                            <ResultIcon status={result.status} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-white/85">{result.fileName}</p>
                            {result.message && (
                                <p className="mt-0.5 text-xs leading-snug text-white/45">{result.message}</p>
                            )}
                        </div>
                        <span className="mt-0.5 shrink-0 text-[10px] font-medium uppercase tracking-wide text-white/25">
                            {kindLabel[result.kind]}
                        </span>
                    </div>
                ))}
            </div>
            {/* Drain bar — mirrors the auto-dismiss timer visually */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
                <div
                    className="h-full origin-left bg-white/25"
                    style={{
                        animation: `toast-drain ${AUTO_DISMISS_MS}ms linear forwards`,
                    }}
                />
            </div>
        </div>
    );
}

