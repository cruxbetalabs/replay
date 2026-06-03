import {
    DefaultColorStyle,
    DefaultSizeStyle,
    type Editor,
    type TLDefaultColorStyle,
    type TLShape,
    type TLShapeId,
} from 'tldraw';
import {
    getAnnotationSizeForStageDimensions,
    getAnnotationTextScaleForStage,
    getAnnotationTextSizeForStageDimensions,
} from './video-annotations';

/** Default stroke/fill color for draw, arrow, and similar tools. */
export const DEFAULT_ANNOTATION_COLOR: TLDefaultColorStyle = 'white';

/** Default color for text annotations. */
export const DEFAULT_ANNOTATION_TEXT_COLOR: TLDefaultColorStyle = 'black';

export function getDefaultAnnotationColorForTool(toolId: string): TLDefaultColorStyle {
    return toolId === 'text' ? DEFAULT_ANNOTATION_TEXT_COLOR : DEFAULT_ANNOTATION_COLOR;
}

const STROKE_SHAPE_TYPES = new Set(['draw', 'highlight', 'arrow', 'geo']);

function drawShapeNeedsStyleRepair(
    props: { size?: string; scale?: number },
    targetSize: string,
): boolean {
    const scale = props.scale;
    const scaleOff = typeof scale === 'number' && Math.abs(scale - 1) > 0.05;
    return props.size !== targetSize || scaleOff;
}

/** Fixes hairline strokes from persisted camera zoom / dynamic-resize scale on draw shapes. */
export function repairAnnotationShapeStyles(
    editor: Editor,
    stageWidth: number,
    stageHeight: number,
    defaultColor: TLDefaultColorStyle = DEFAULT_ANNOTATION_COLOR,
): void {
    const size = getAnnotationSizeForStageDimensions(stageWidth, stageHeight);
    const textSize = getAnnotationTextSizeForStageDimensions(stageWidth, stageHeight);
    const textScale = getAnnotationTextScaleForStage(stageWidth, stageHeight);
    const updates: TLShape[] = [];

    editor.getCurrentPageShapes().forEach((shape) => {
        if (shape.type === 'text' && shape.props && typeof shape.props === 'object') {
            const props = shape.props as { scale?: number; size?: string; color?: string };
            const nextColor = props.color ?? DEFAULT_ANNOTATION_TEXT_COLOR;
            if (props.size === textSize && props.scale === textScale && props.color) {
                return;
            }

            updates.push({
                ...shape,
                props: {
                    ...shape.props,
                    size: textSize,
                    scale: textScale,
                    color: nextColor,
                },
            } as TLShape);
            return;
        }

        if (!STROKE_SHAPE_TYPES.has(shape.type) || !shape.props || typeof shape.props !== 'object') {
            return;
        }

        const props = shape.props as { size?: string; scale?: number; color?: string };
        const needsStrokeRepair = shape.type === 'draw' || shape.type === 'highlight'
            ? drawShapeNeedsStyleRepair(props, size)
            : props.size !== size;
        if (!needsStrokeRepair && props.color) {
            return;
        }

        updates.push({
            ...shape,
            props: {
                ...shape.props,
                size,
                ...(shape.type === 'draw' || shape.type === 'highlight' ? { scale: 1 } : {}),
                color: props.color ?? defaultColor,
            },
        } as TLShape);
    });

    if (updates.length === 0) {
        return;
    }

    editor.run(() => {
        editor.updateShapes(updates);
    }, { history: 'ignore' });
}

/** Applies a tldraw color to the current style and to selected shapes (including draw strokes). */
export function applyAnnotationColorToEditor(
    editor: Editor,
    color: TLDefaultColorStyle,
): void {
    editor.run(() => {
        editor.setStyleForNextShapes(DefaultColorStyle, color);

        const selectedIds = editor.getSelectedShapeIds();
        if (selectedIds.length === 0) {
            return;
        }

        editor.setStyleForSelectedShapes(DefaultColorStyle, color);

        const updates: TLShape[] = [];
        selectedIds.forEach((id) => {
            const shape = editor.getShape(id);
            if (!shape) {
                return;
            }

            if (shape.type === 'draw' || shape.type === 'geo' || shape.type === 'arrow' || shape.type === 'text') {
                updates.push({
                    ...shape,
                    props: {
                        ...shape.props,
                        color,
                    },
                } as TLShape);
            }
        });

        if (updates.length > 0) {
            editor.updateShapes(updates);
        }
    });
}

export function isShapeRecordId(id: string): boolean {
    return id.startsWith('shape:');
}

export function applyAnnotationDefaultStylesForTool(
    editor: Editor,
    toolId: string,
    stageWidth: number,
    stageHeight: number,
): void {
    const size = toolId === 'text'
        ? getAnnotationTextSizeForStageDimensions(stageWidth, stageHeight)
        : getAnnotationSizeForStageDimensions(stageWidth, stageHeight);
    editor.setStyleForNextShapes(DefaultSizeStyle, size);
    editor.setStyleForNextShapes(DefaultColorStyle, getDefaultAnnotationColorForTool(toolId));
}
