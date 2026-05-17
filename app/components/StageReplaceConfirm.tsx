'use client';

interface StageReplaceConfirmProps {
    fileName: string;
    kind: 'video' | 'json';
    onConfirm: () => void;
    onCancel: () => void;
}

const kindLabel: Record<StageReplaceConfirmProps['kind'], string> = {
    video: 'video',
    json: 'metadata JSON',
};

export function StageReplaceConfirm({ fileName, kind, onConfirm, onCancel }: StageReplaceConfirmProps) {
    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-[2px]">
            <div className="mx-4 w-full max-w-xs rounded-xl border border-white/15 bg-gray-900 p-5 shadow-2xl">
                <p className="text-sm font-semibold text-white">
                    Replace {kindLabel[kind]}?
                </p>
                <p className="mt-1.5 break-all text-xs text-white/55">
                    <span className="font-medium text-white/80">{fileName}</span>
                    {' '}will replace the current {kindLabel[kind]}.
                </p>
                <div className="mt-4 flex gap-2">
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
                        className="flex-1 rounded-lg bg-white py-2 text-xs font-medium text-black transition-colors hover:bg-white/90"
                    >
                        Replace
                    </button>
                </div>
            </div>
        </div>
    );
}
