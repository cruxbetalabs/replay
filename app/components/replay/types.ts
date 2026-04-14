import type { VideoSourceIdentity } from '../../lib/key-moments';
import type { TrajectoryMetadata } from '../../lib/trajectory-types';

export interface ReplayComparisonTrajectoryInput {
    metadata: TrajectoryMetadata | string | null;
    fileName?: string | null;
    error?: string | null;
    warnings?: string[];
}

export interface ReplayComparisonSource {
    label?: string;
    video: string | Blob | null;
    videoIdentity?: VideoSourceIdentity | null;
    trajectory?: ReplayComparisonTrajectoryInput | null;
}