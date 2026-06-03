'use client';

import { useEffect, useRef, useState } from 'react';
import {
    DefaultColorStyle,
    getColorValue,
    track,
    useEditor,
    type TLDefaultColorStyle,
} from 'tldraw';
import { applyAnnotationColorToEditor } from '../../lib/annotation-shape-styles';
import styles from './AnnotationColorPicker.module.css';

/** Two rows × four columns — tldraw style keys. */
const ANNOTATION_COLORS: TLDefaultColorStyle[] = [
    'black',
    'grey',
    'white',
    'red',
    'green',
    'blue',
    'orange',
    'yellow',
];

const LIGHT_SWATCH_COLORS = new Set<TLDefaultColorStyle>(['white', 'grey']);

const COLOR_BUTTON_CLASS = [
    'relative inline-flex size-8 items-center justify-center rounded-md border border-white/15',
    'bg-black/55 shadow-lg backdrop-blur-sm transition-colors',
    'hover:bg-white/15',
    'data-[open=true]:border-white/40 data-[open=true]:bg-white/20',
].join(' ');

function getActiveColor(editor: ReturnType<typeof useEditor>): TLDefaultColorStyle {
    const sharedColor = editor.getSharedStyles().get(DefaultColorStyle);
    if (sharedColor?.type === 'shared') {
        return sharedColor.value;
    }

    return editor.getStyleForNextShape(DefaultColorStyle);
}

function applyColor(editor: ReturnType<typeof useEditor>, color: TLDefaultColorStyle) {
    applyAnnotationColorToEditor(editor, color);
}

export const AnnotationColorPicker = track(function AnnotationColorPicker() {
    const editor = useEditor();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeColor = getActiveColor(editor);
    const swatchThemeColors = editor.getCurrentTheme().colors.light;
    const activeHex = getColorValue(swatchThemeColors, activeColor, 'solid');

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isOpen]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                className={COLOR_BUTTON_CLASS}
                data-open={isOpen}
                aria-label="Drawing color"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                onClick={() => setIsOpen((open) => !open)}
            >
                <span
                    className="size-4 rounded-full border border-white/30"
                    style={{ backgroundColor: activeHex }}
                />
            </button>

            {isOpen && (
                <div className={styles.popover} role="listbox" aria-label="Drawing colors">
                    <div className={styles.grid}>
                        {ANNOTATION_COLORS.map((color) => {
                            const hex = getColorValue(swatchThemeColors, color, 'solid');
                            const isSelected = color === activeColor;
                            const isLightSwatch = LIGHT_SWATCH_COLORS.has(color);

                            return (
                                <button
                                    key={color}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    aria-label={`Color ${color}`}
                                    className={styles.swatch}
                                    data-selected={isSelected}
                                    onClick={() => {
                                        applyColor(editor, color);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span
                                        className={styles.swatchInner}
                                        data-light={isLightSwatch}
                                        style={{ backgroundColor: hex }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});
