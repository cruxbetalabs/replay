import type { KeyMoment } from './key-moments';

export interface KeyMomentPresetState {
    keyMoments: KeyMoment[];
    selectedKeyMomentId: string | null;
}

export interface PresetComparison {
    id: string;
    label: string;
    keyMomentsUrl?: string;
    left: {
        videoUrl: string;
        metadataUrl: string;
        videoFileName: string;
        metadataFileName: string;
    };
    right?: {
        videoUrl: string;
        metadataUrl: string;
        videoFileName: string;
        metadataFileName: string;
    };
}

export const PRESET_COMPARISONS: PresetComparison[] = [
    {
        id: '1',
        label: 'Load Example 1',
        keyMomentsUrl: '/examples/1-keyframes.config.json',
        left: {
            videoUrl: '/examples/1-left.mp4',
            metadataUrl: '/examples/1-left_trajectory_metadata.json',
            videoFileName: '1-left.mp4',
            metadataFileName: '1-left_trajectory_metadata.json',
        },
        right: {
            videoUrl: '/examples/1-right.mp4',
            metadataUrl: '/examples/1-right_trajectory_metadata.json',
            videoFileName: '1-right.mp4',
            metadataFileName: '1-right_trajectory_metadata.json',
        },
    },
    {
        id: '2',
        label: 'Load Example 2',
        left: {
            videoUrl: '/examples/2.mp4',
            metadataUrl: '/examples/2_trajectory_metadata.json',
            videoFileName: '2.mp4',
            metadataFileName: '2_trajectory_metadata.json',
        },
    },
];
