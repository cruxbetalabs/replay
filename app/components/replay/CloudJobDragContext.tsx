'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    type ReactNode,
} from 'react';
import type { CloudJobDragSource } from '../../lib/replay-cloud/drag';

export interface CloudJobDragSession {
    source: CloudJobDragSource;
    jobId: string;
}

interface CloudDialogControl {
    close: () => void;
    reopen: () => void;
}

interface CloudJobDragContextValue {
    dragSessionRef: React.RefObject<CloudJobDragSession | null>;
    beginDrag: (source: CloudJobDragSource, jobId: string) => void;
    endDrag: (dropEffect: DataTransfer['dropEffect']) => void;
    notifyDropSuccess: () => void;
    registerCloudDialogControl: (control: CloudDialogControl) => void;
}

const CloudJobDragContext = createContext<CloudJobDragContextValue | null>(null);

export function CloudJobDragProvider({ children }: { children: ReactNode }) {
    const dragSessionRef = useRef<CloudJobDragSession | null>(null);
    const cloudDialogRef = useRef<CloudDialogControl | null>(null);
    const dropSucceededRef = useRef(false);
    const dialogDragActiveRef = useRef(false);
    const closeDialogFrameRef = useRef<number | null>(null);
    const documentDragEndAttachedRef = useRef(false);

    const registerCloudDialogControl = useCallback((control: CloudDialogControl) => {
        cloudDialogRef.current = control;
    }, []);

    const cancelScheduledDialogClose = useCallback(() => {
        if (closeDialogFrameRef.current !== null) {
            window.cancelAnimationFrame(closeDialogFrameRef.current);
            closeDialogFrameRef.current = null;
        }
    }, []);

    const detachDocumentDragEnd = useCallback((handler: (event: DragEvent) => void) => {
        if (!documentDragEndAttachedRef.current) {
            return;
        }
        document.removeEventListener('dragend', handler, true);
        documentDragEndAttachedRef.current = false;
    }, []);

    const finishDialogDrag = useCallback((dropEffect: DataTransfer['dropEffect']) => {
        dialogDragActiveRef.current = false;
        dragSessionRef.current = null;
        cancelScheduledDialogClose();

        const shouldReopen = !dropSucceededRef.current && dropEffect === 'none';
        dropSucceededRef.current = false;

        if (shouldReopen) {
            cloudDialogRef.current?.reopen();
        }
    }, [cancelScheduledDialogClose]);

    const handleDocumentDragEnd = useCallback((event: DragEvent) => {
        if (!dialogDragActiveRef.current) {
            return;
        }
        detachDocumentDragEnd(handleDocumentDragEnd);
        finishDialogDrag(event.dataTransfer?.dropEffect ?? 'none');
    }, [detachDocumentDragEnd, finishDialogDrag]);

    const beginDrag = useCallback((source: CloudJobDragSource, jobId: string) => {
        dragSessionRef.current = { source, jobId };
        dropSucceededRef.current = false;

        if (source !== 'dialog') {
            return;
        }

        dialogDragActiveRef.current = true;
        document.addEventListener('dragend', handleDocumentDragEnd, true);
        documentDragEndAttachedRef.current = true;

        closeDialogFrameRef.current = window.requestAnimationFrame(() => {
            closeDialogFrameRef.current = null;
            cloudDialogRef.current?.close();
        });
    }, [handleDocumentDragEnd]);

    const endDrag = useCallback((dropEffect: DataTransfer['dropEffect']) => {
        if (dialogDragActiveRef.current) {
            detachDocumentDragEnd(handleDocumentDragEnd);
            finishDialogDrag(dropEffect);
            return;
        }

        dragSessionRef.current = null;
    }, [detachDocumentDragEnd, finishDialogDrag, handleDocumentDragEnd]);

    const notifyDropSuccess = useCallback(() => {
        dropSucceededRef.current = true;
        dragSessionRef.current = null;
    }, []);

    useEffect(() => () => {
        cancelScheduledDialogClose();
        if (documentDragEndAttachedRef.current) {
            document.removeEventListener('dragend', handleDocumentDragEnd, true);
        }
    }, [cancelScheduledDialogClose, handleDocumentDragEnd]);

    const value = useMemo(() => ({
        dragSessionRef,
        beginDrag,
        endDrag,
        notifyDropSuccess,
        registerCloudDialogControl,
    }), [beginDrag, endDrag, notifyDropSuccess, registerCloudDialogControl]);

    return (
        <CloudJobDragContext.Provider value={value}>
            {children}
        </CloudJobDragContext.Provider>
    );
}

export function useCloudJobDragOptional() {
    return useContext(CloudJobDragContext);
}
