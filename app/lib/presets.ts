import type { KeyMoment, VideoIndex } from './key-moments';

export interface KeyMomentPresetState {
    keyMoments: KeyMoment[];
    selectedKeyMomentId: string | null;
}

export type PresetLoadTarget =
    | 'comparison'
    | { slot: VideoIndex };

export function isComparisonPreset(preset: PresetComparison): boolean {
    return preset.right !== undefined;
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
        id: 'pogo-failed-comparison',
        label: 'Pogo Comparison: Failure',
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
        id: 'pogo-success-comparison',
        label: 'Pogo Comparison: Success',
        keyMomentsUrl: '/examples/1-milan-peter-keyframes.config.json',
        left: {
            videoUrl: '/examples/1-milan.mp4',
            metadataUrl: '/examples/1-milan_trajectory_metadata.json',
            videoFileName: '1-milan.mp4',
            metadataFileName: '1-milan_trajectory_metadata.json',
        },
        right: {
            videoUrl: '/examples/1-peter.mp4',
            metadataUrl: '/examples/1-peter_trajectory_metadata.json',
            videoFileName: '1-peter.mp4',
            metadataFileName: '1-peter_trajectory_metadata.json',
        },
    },
    {
        id: 'pogo-success-vs-fail-comparison',
        label: 'Pogo Comparison: Success v. Failure',
        keyMomentsUrl: '/examples/1-milan-tommy-keyframes.config.json',
        left: {
            videoUrl: '/examples/1-milan.mp4',
            metadataUrl: '/examples/1-milan_trajectory_metadata.json',
            videoFileName: '1-milan.mp4',
            metadataFileName: '1-milan_trajectory_metadata.json',
        },
        right: {
            videoUrl: '/examples/1-left.mp4',
            metadataUrl: '/examples/1-left_trajectory_metadata.json',
            videoFileName: '1-left.mp4',
            metadataFileName: '1-left_trajectory_metadata.json',
        },
    },
    {
        id: 'pogo-tommy-one',
        label: '(Pogo Failure) Tommy I',
        left: {
            videoUrl: '/examples/1-left.mp4',
            metadataUrl: '/examples/1-left_trajectory_metadata.json',
            videoFileName: '1-left.mp4',
            metadataFileName: '1-left_trajectory_metadata.json',
        },
    },
    {
        id: 'pogo-tommy-two',
        label: '(Pogo Failure) Tommy II',
        left: {
            videoUrl: '/examples/1-right.mp4',
            metadataUrl: '/examples/1-right_trajectory_metadata.json',
            videoFileName: '1-right.mp4',
            metadataFileName: '1-right_trajectory_metadata.json',
        },
    },
    {
        id: 'milan',
        label: '(Pogo Success) Milan',
        left: {
            videoUrl: '/examples/1-milan.mp4',
            metadataUrl: '/examples/1-milan_trajectory_metadata.json',
            videoFileName: '1-milan.mp4',
            metadataFileName: '1-milan_trajectory_metadata.json',
        },
    },
    {
        id: 'peter',
        label: '(Pogo Success) Peter',
        left: {
            videoUrl: '/examples/1-peter.mp4',
            metadataUrl: '/examples/1-peter_trajectory_metadata.json',
            videoFileName: '1-peter.mp4',
            metadataFileName: '1-peter_trajectory_metadata.json',
        },
    },
    {
        id: 'mosaic-blue-tag',
        label: 'Mosaic blue tag',
        left: {
            videoUrl: '/examples/2.mp4',
            metadataUrl: '/examples/2_trajectory_metadata.json',
            videoFileName: '2.mp4',
            metadataFileName: '2_trajectory_metadata.json',
        },
    },
];
