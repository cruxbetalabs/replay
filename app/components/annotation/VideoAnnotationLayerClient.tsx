'use client';

import dynamic from 'next/dynamic';

export const VideoAnnotationLayer = dynamic(
    () => import('./VideoAnnotationLayer').then((module) => module.VideoAnnotationLayer),
    { ssr: false },
);
