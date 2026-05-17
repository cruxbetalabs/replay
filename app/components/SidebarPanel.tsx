import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SidebarPanelProps {
    title: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function SidebarPanel({ title, action, children, className }: SidebarPanelProps) {
    return (
        <div className={cn('bg-white px-6 pt-5 pb-7 dark:bg-gray-900 border-b', className)}>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{title}</h2>
                {action}
            </div>
            {children}
        </div>
    );
}
