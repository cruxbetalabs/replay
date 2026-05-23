'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { SidebarPanel } from './SidebarPanel';
import type { Annotation, AnnotationLabelGroup } from '../lib/annotations';
import { Badge } from '@/components/ui/badge';
import {
    BODY_POSE_LABELS,
    CONTACT_TECHNIQUE_LABELS,
    MOVEMENT_LABELS,
} from '../lib/annotations';

// ─── Panel-level frame filter (percentage-based) ─────────────────────────────

interface RangeFilterProps {
    startPct: number;
    endPct: number;
    onChangeStart: (v: number) => void;
    onChangeEnd: (v: number) => void;
}

function RangeFilter({ startPct, endPct, onChangeStart, onChangeEnd }: RangeFilterProps) {
    return (
        <div className="relative h-6 flex items-center">
            <div className="absolute left-0 right-0 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div
                className="absolute h-1 rounded-full bg-blue-500"
                style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
            />
            <div
                className="absolute w-3.5 h-3.5 -translate-x-1/2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900 pointer-events-none shadow"
                style={{ left: `${startPct}%` }}
            />
            <div
                className="absolute w-3.5 h-3.5 -translate-x-1/2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900 pointer-events-none shadow"
                style={{ left: `${endPct}%` }}
            />
            <input
                type="range" min="0" max="100" step="1"
                value={Math.round(startPct)}
                onChange={(e) => onChangeStart(Math.min(Number(e.target.value), endPct - 2))}
                className="absolute h-full opacity-0 cursor-pointer"
                style={{ left: 0, right: `${100 - endPct}%`, zIndex: startPct < 1 && endPct > 1 ? 5 : 3 }}
            />
            <input
                type="range" min="0" max="100" step="1"
                value={Math.round(endPct)}
                onChange={(e) => onChangeEnd(Math.max(Number(e.target.value), startPct + 2))}
                className="absolute h-full opacity-0 cursor-pointer"
                style={{ left: `${startPct}%`, right: 0, zIndex: startPct < 1 && endPct > 1 ? 4 : 5 }}
            />
        </div>
    );
}

// ─── Per-annotation dual-handle range slider ──────────────────────────────────

interface AnnotationRangeSliderProps {
    annotation: Annotation;
    duration: number;
    onUpdateRange: (id: string, startTime: number, endTime: number) => void;
    onSeekVideo: (videoIndex: 0 | 1, time: number) => void;
}

function AnnotationRangeSlider({ annotation, duration, onUpdateRange, onSeekVideo }: AnnotationRangeSliderProps) {
    const maxDuration = Math.max(duration, 1);
    const startPct = (annotation.startTime / maxDuration) * 100;
    const endPct = (annotation.endTime / maxDuration) * 100;
    const isVideo1 = annotation.videoIndex === 0;
    const color = isVideo1 ? 'bg-blue-500' : 'bg-emerald-500';

    // Pixel-perfect logic (custom pointer handlers)
    const sliderRef = useRef<HTMLDivElement>(null);
    const draggingThumb = useRef<'start' | 'end' | null>(null);

    const getPercentFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
        // Get percent from pointer position within slider box
        const rect = sliderRef.current?.getBoundingClientRect();
        if (!rect) return 0;
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        return (x / rect.width) * 100;
    };

    const handleThumbPointerDown = (which: 'start' | 'end') => (e: React.PointerEvent<HTMLDivElement>) => {
        draggingThumb.current = which;
        (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!draggingThumb.current) return;
        const pct = getPercentFromEvent(e);
        let newStart = annotation.startTime;
        let newEnd = annotation.endTime;
        const minGapSeconds = 1 / Math.max(25, maxDuration * 25 / 100); // Allow tiny overlap
        if (draggingThumb.current === 'start') {
            newStart = Math.min(maxDuration, Math.max(0, (pct / 100) * maxDuration));
            if (newStart > newEnd - minGapSeconds) {
                newStart = newEnd - minGapSeconds;
            }
        } else if (draggingThumb.current === 'end') {
            newEnd = Math.max(0, Math.min(maxDuration, (pct / 100) * maxDuration));
            if (newEnd < newStart + minGapSeconds) {
                newEnd = newStart + minGapSeconds;
            }
        }
        onUpdateRange(annotation.id, Math.max(newStart, 0), Math.min(newEnd, maxDuration));
        onSeekVideo(annotation.videoIndex, draggingThumb.current === 'start' ? newStart : newEnd);
    };

    const handlePointerUp = () => {
        draggingThumb.current = null;
    };

    return (
        <div
            ref={sliderRef}
            className="relative h-6 flex items-center select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div className="absolute left-0 right-0 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div
                className={`absolute h-1 rounded-full ${color}`}
                style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
            />
            {/* Start Thumb */}
            <div
                role="slider"
                tabIndex={0}
                aria-valuenow={annotation.startTime}
                aria-valuemax={annotation.endTime}
                className={`absolute w-3 h-3 -translate-x-1/2 rounded-full ${color} ring-2 ring-white dark:ring-gray-900 shadow-sm cursor-pointer z-10`}
                style={{ left: `${startPct}%` }}
                onPointerDown={handleThumbPointerDown('start')}
            />
            {/* End Thumb */}
            <div
                role="slider"
                tabIndex={0}
                aria-valuenow={annotation.endTime}
                aria-valuemin={annotation.startTime}
                className={`absolute w-3 h-3 -translate-x-1/2 rounded-full ${color} ring-2 ring-white dark:ring-gray-900 shadow-sm cursor-pointer z-10`}
                style={{ left: `${endPct}%` }}
                onPointerDown={handleThumbPointerDown('end')}
            />
        </div>
    );
}

// ─── Label groups ─────────────────────────────────────────────────────────────

const LABEL_GROUPS = [
    { title: 'Stance', group: 'bodyPose' as AnnotationLabelGroup, labels: BODY_POSE_LABELS },
    { title: 'Grip', group: 'contactTechnique' as AnnotationLabelGroup, labels: CONTACT_TECHNIQUE_LABELS },
    { title: 'Flow', group: 'movement' as AnnotationLabelGroup, labels: MOVEMENT_LABELS },
] as const;

// ─── Annotation card ─────────────────────────────────────────────────────────

interface AnnotationCardProps {
    annotation: Annotation;
    isSelected: boolean;
    duration1: number;
    duration2: number;
    onSelect: () => void;
    onDeselect: () => void;
    onDelete: () => void;
    onUpdateRange: (id: string, startTime: number, endTime: number) => void;
    onToggleLabel: (id: string, group: AnnotationLabelGroup, label: string) => void;
    onSetNotes: (id: string, notes: string) => void;
    onSeekVideo: (videoIndex: 0 | 1, time: number) => void;
}

function AnnotationCard({
    annotation,
    isSelected,
    duration1,
    duration2,
    onSelect,
    onDeselect,
    onDelete,
    onUpdateRange,
    onToggleLabel,
    onSetNotes,
    onSeekVideo,
}: AnnotationCardProps) {
    const isVideo1 = annotation.videoIndex === 0;
    const selectedColor = isVideo1
        ? 'bg-blue-500 hover:bg-blue-600 border-blue-500'
        : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500';
    const duration = isVideo1 ? duration1 : duration2;
    const isSingleFrame = annotation.startFrame === annotation.endFrame;
    const frameLabel = isSingleFrame
        ? `f:${annotation.startFrame}`
        : `f:${annotation.startFrame}–${annotation.endFrame}`;

    const allLabels = [
        ...annotation.bodyPoseLabels,
        ...annotation.contactTechniqueLabels,
        ...annotation.movementLabels,
    ];

    return (
        <div
            className={`rounded-lg border transition-colors ${isSelected
                ? isVideo1
                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                    : 'border-emerald-400 dark:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
        >
            {/* Header row */}
            <div
                className="flex items-start gap-2 px-3 pt-2.5 pb-2 cursor-pointer"
                onClick={() => (isSelected ? onDeselect() : onSelect())}
            >
                <div className="mt-0.5 text-gray-400 dark:text-gray-500 shrink-0">
                    {isSelected
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />
                    }
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isVideo1
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                }`}
                        >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isVideo1 ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                            {isVideo1 ? 'Video 1' : 'Video 2'}
                        </span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{frameLabel}</span>
                    </div>
                    {!isSelected && allLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {allLabels.slice(0, 5).map((l) => (
                                <span key={l} className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0 text-[10px] text-gray-600 dark:text-gray-300">
                                    {l.replace(/_/g, '\u00a0')}
                                </span>
                            ))}
                            {allLabels.length > 5 && (
                                <span className="text-[10px] text-gray-400">+{allLabels.length - 5}</span>
                            )}
                        </div>
                    )}
                    {!isSelected && annotation.notes && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{annotation.notes}</p>
                    )}
                </div>
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                        aria-label="Delete annotation"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* Expanded content */}
            {isSelected && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-3 pb-3 pt-2.5 space-y-3">
                    {/* Range slider */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                Frame range
                            </span>
                            <span className={`text-[10px] font-mono ${isVideo1 ? 'text-blue-500' : 'text-emerald-500'}`}>
                                {frameLabel}
                            </span>
                        </div>
                        <AnnotationRangeSlider
                            annotation={annotation}
                            duration={duration}
                            onUpdateRange={onUpdateRange}
                            onSeekVideo={onSeekVideo}
                        />
                    </div>

                    {/* Label groups */}
                    {LABEL_GROUPS.map(({ title, group, labels }) => {
                        const activeLabels: string[] =
                            group === 'bodyPose' ? annotation.bodyPoseLabels
                                : group === 'contactTechnique' ? annotation.contactTechniqueLabels
                                    : annotation.movementLabels;
                        return (
                            <div key={group} className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                    {title}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {labels.map((label: string) => {
                                        const active = activeLabels.includes(label);
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => onToggleLabel(annotation.id, group, label)}
                                                className="focus:outline-none"
                                            >
                                                <Badge

                                                    variant={active ? "default" : "outline"}
                                                    className={active ? selectedColor : ""}
                                                >
                                                    {label.replace(/_/g, '\u00a0')}
                                                </Badge>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Notes */}
                    <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            Notes
                        </span>
                        <textarea
                            value={annotation.notes ?? ''}
                            onChange={(e) => onSetNotes(annotation.id, e.target.value)}
                            placeholder="Coach or climber notes…"
                            rows={2}
                            className="w-full resize-none rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-base text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export interface AnnotationPanelProps {
    hasVideo1: boolean;
    hasVideo2: boolean;
    duration1: number;
    duration2: number;
    fps1: number | null;
    fps2: number | null;
    annotations: Annotation[];
    selectedAnnotationId: string | null;
    onSelectAnnotation: (id: string) => void;
    onDeselectAnnotation: () => void;
    onCreateAnnotation1: () => void;
    onCreateAnnotation2: () => void;
    onDeleteAnnotation: (id: string) => void;
    onUpdateAnnotationRange: (id: string, startTime: number, endTime: number) => void;
    onToggleAnnotationLabel: (id: string, group: AnnotationLabelGroup, label: string) => void;
    onSetAnnotationNotes: (id: string, notes: string) => void;
    onSeekVideo: (videoIndex: 0 | 1, time: number) => void;
}

export function AnnotationPanel({
    hasVideo1,
    hasVideo2,
    duration1,
    duration2,
    fps1,
    fps2,
    annotations,
    selectedAnnotationId,
    onSelectAnnotation,
    onDeselectAnnotation,
    onCreateAnnotation1,
    onCreateAnnotation2,
    onDeleteAnnotation,
    onUpdateAnnotationRange,
    onToggleAnnotationLabel,
    onSetAnnotationNotes,
    onSeekVideo,
}: AnnotationPanelProps) {
    const [filterStartPct, setFilterStartPct] = useState(0);
    const [filterEndPct, setFilterEndPct] = useState(100);

    const maxDuration = Math.max(duration1, duration2, 1);
    const isFiltered = filterStartPct > 0 || filterEndPct < 100;

    const filteredAnnotations = isFiltered
        ? annotations.filter((a) => {
            const startTime = (filterStartPct / 100) * maxDuration;
            const endTime = (filterEndPct / 100) * maxDuration;
            return a.startTime >= startTime && a.startTime <= endTime;
        })
        : annotations;

    const fps = fps1 ?? fps2 ?? 30;
    const startFrame = Math.round((filterStartPct / 100) * maxDuration * fps);
    const endFrame = Math.round((filterEndPct / 100) * maxDuration * fps);

    return (
        <SidebarPanel
            title="Annotations"
            action={
                (hasVideo1 || hasVideo2) ? (
                    <ButtonGroup>
                        {hasVideo1 && (
                            <Button type="button" variant="outline" size="sm" onClick={onCreateAnnotation1}>
                                <Plus className="h-3 w-3" />
                                Video 1
                            </Button>
                        )}
                        {hasVideo2 && (
                            <Button type="button" variant="outline" size="sm" onClick={onCreateAnnotation2}>
                                <Plus className="h-3 w-3" />
                                Video 2
                            </Button>
                        )}
                    </ButtonGroup>
                ) : undefined
            }
        >
            {(hasVideo1 || hasVideo2) && (
                <div className="mb-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            Frame filter
                        </span>
                        {isFiltered && (
                            <button
                                type="button"
                                onClick={() => { setFilterStartPct(0); setFilterEndPct(100); }}
                                className="text-[10px] text-blue-500 hover:underline"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                    <RangeFilter
                        startPct={filterStartPct}
                        endPct={filterEndPct}
                        onChangeStart={setFilterStartPct}
                        onChangeEnd={setFilterEndPct}
                    />
                    <div className="flex justify-between text-[10px] font-mono text-gray-400 dark:text-gray-500">
                        <span>f:{startFrame}</span>
                        <span>f:{endFrame}</span>
                    </div>
                </div>
            )}

            {filteredAnnotations.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                    {isFiltered
                        ? 'No annotations in this frame range.'
                        : 'No annotations yet. Use the + buttons above to add one.'}
                </p>
            ) : (
                <div className="space-y-2">
                    {filteredAnnotations.map((annotation) => (
                        <AnnotationCard
                            key={annotation.id}
                            annotation={annotation}
                            isSelected={annotation.id === selectedAnnotationId}
                            duration1={duration1}
                            duration2={duration2}
                            onSelect={() => onSelectAnnotation(annotation.id)}
                            onDeselect={onDeselectAnnotation}
                            onDelete={() => onDeleteAnnotation(annotation.id)}
                            onUpdateRange={onUpdateAnnotationRange}
                            onToggleLabel={onToggleAnnotationLabel}
                            onSetNotes={onSetAnnotationNotes}
                            onSeekVideo={onSeekVideo}
                        />
                    ))}
                </div>
            )}
        </SidebarPanel>
    );
}
