'use client';

import {
    ArrowUpRight,
    Eraser,
    MousePointer2,
    Pencil,
    Trash2,
    Type,
} from 'lucide-react';
import { track, useEditor } from 'tldraw';
import { applyAnnotationDefaultStylesForTool } from '../../lib/annotation-shape-styles';
import { AnnotationColorPicker } from './AnnotationColorPicker';

const TOOL_BUTTON_CLASS = [
    'inline-flex size-8 items-center justify-center rounded-md border border-white/15',
    'bg-black/55 text-white/80 shadow-lg backdrop-blur-sm transition-colors',
    'hover:bg-white/15 hover:text-white',
    'data-[active=true]:border-white/40 data-[active=true]:bg-white/20 data-[active=true]:text-black',
    'data-[active=true]:hover:text-black',
].join(' ');

const CLEAR_BUTTON_CLASS = [
    'inline-flex size-8 items-center justify-center rounded-md border border-white/15',
    'bg-black/55 text-white/80 shadow-lg backdrop-blur-sm transition-colors',
    'hover:bg-red-500/30 hover:text-white',
    'disabled:cursor-not-allowed disabled:opacity-40',
].join(' ');

export const AnnotationToolbar = track(function AnnotationToolbar({
    stageWidth,
    stageHeight,
}: {
    stageWidth: number;
    stageHeight: number;
}) {
    const editor = useEditor();
    const currentToolId = editor.getCurrentToolId();
    const shapeIds = editor.getCurrentPageShapeIds();
    const hasAnnotations = shapeIds.size > 0;

    const selectTool = (toolId: 'select' | 'draw' | 'eraser' | 'text' | 'arrow') => {
        editor.setCurrentTool(toolId);
        applyAnnotationDefaultStylesForTool(editor, toolId, stageWidth, stageHeight);
    };

    const handleClearAllAnnotations = () => {
        const ids = editor.getCurrentPageShapeIds();
        if (ids.size === 0) {
            return;
        }

        editor.selectNone();
        editor.deleteShapes([...ids]);
    };

    return (
        <div className="pointer-events-auto flex items-center gap-1.5">
            <button
                type="button"
                className={CLEAR_BUTTON_CLASS}
                aria-label="Delete all annotations"
                disabled={!hasAnnotations}
                onClick={handleClearAllAnnotations}
            >
                <Trash2 className="size-4" />
            </button>
            <button
                type="button"
                className={TOOL_BUTTON_CLASS}
                data-active={currentToolId === 'select'}
                aria-label="Select"
                onClick={() => selectTool('select')}
            >
                <MousePointer2 className="size-4" />
            </button>
            <button
                type="button"
                className={TOOL_BUTTON_CLASS}
                data-active={currentToolId === 'draw'}
                aria-label="Free draw"
                onClick={() => selectTool('draw')}
            >
                <Pencil className="size-4" />
            </button>
            <AnnotationColorPicker />
            <button
                type="button"
                className={TOOL_BUTTON_CLASS}
                data-active={currentToolId === 'eraser'}
                aria-label="Eraser"
                onClick={() => selectTool('eraser')}
            >
                <Eraser className="size-4" />
            </button>
            <button
                type="button"
                className={TOOL_BUTTON_CLASS}
                data-active={currentToolId === 'text'}
                aria-label="Text"
                onClick={() => selectTool('text')}
            >
                <Type className="size-4" />
            </button>
            <button
                type="button"
                className={TOOL_BUTTON_CLASS}
                data-active={currentToolId === 'arrow'}
                aria-label="Arrow"
                onClick={() => selectTool('arrow')}
            >
                <ArrowUpRight className="size-4" />
            </button>
        </div>
    );
});
