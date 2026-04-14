import type {
    PoseFrame,
    PoseLandmark,
    PoseMetadata,
    TrajectoryMetadata,
    TrajectoryPoint,
    TrajectorySample,
    TrajectoryTrack,
    TrajectoryVector2D,
    VelocityColorPreset,
} from './trajectory-types';

export interface ParsedTrajectoryMetadata {
    metadata: TrajectoryMetadata;
    warnings: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const requireRecord = (value: unknown, label: string): Record<string, unknown> => {
    if (!isRecord(value)) {
        throw new Error(`${label} must be an object.`);
    }

    return value;
};

const requireString = (value: unknown, label: string): string => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`${label} must be a non-empty string.`);
    }

    return value;
};

const requireFiniteNumber = (value: unknown, label: string): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`${label} must be a finite number.`);
    }

    return value;
};

const requireInteger = (value: unknown, label: string): number => {
    const nextValue = requireFiniteNumber(value, label);
    if (!Number.isInteger(nextValue)) {
        throw new Error(`${label} must be an integer.`);
    }

    return nextValue;
};

const requireColorTriplet = (value: unknown, label: string): [number, number, number] => {
    if (!Array.isArray(value) || value.length !== 3) {
        throw new Error(`${label} must be an array with 3 numeric items.`);
    }

    const channels = value.map((channel, index) => requireFiniteNumber(channel, `${label}[${index}]`));
    return [channels[0], channels[1], channels[2]];
};

const parseSourceVideo = (value: unknown, label: string) => {
    const sourceVideo = requireRecord(value, label);

    return {
        width: requireInteger(sourceVideo.width, `${label}.width`),
        height: requireInteger(sourceVideo.height, `${label}.height`),
        fps: requireFiniteNumber(sourceVideo.fps, `${label}.fps`),
        frameCount: requireInteger(sourceVideo.frame_count, `${label}.frame_count`),
    };
};

const parseCoordinateSpace = (value: unknown, label: string) => {
    const coordinateSpace = requireRecord(value, label);

    return {
        type: requireString(coordinateSpace.type, `${label}.type`),
        origin: requireString(coordinateSpace.origin, `${label}.origin`),
        xAxis: requireString(coordinateSpace.x_axis, `${label}.x_axis`),
        yAxis: requireString(coordinateSpace.y_axis, `${label}.y_axis`),
        width: requireInteger(coordinateSpace.width, `${label}.width`),
        height: requireInteger(coordinateSpace.height, `${label}.height`),
    };
};

const parsePoint = (value: unknown, label: string): TrajectoryPoint | null => {
    if (value === null) {
        return null;
    }

    const point = requireRecord(value, label);
    return {
        x: requireFiniteNumber(point.x, `${label}.x`),
        y: requireFiniteNumber(point.y, `${label}.y`),
    };
};

const parseVector2D = (value: unknown, label: string): TrajectoryVector2D | null => {
    if (value === null || value === undefined) {
        return null;
    }

    const vector = requireRecord(value, label);
    return {
        dx: requireFiniteNumber(vector.dx, `${label}.dx`),
        dy: requireFiniteNumber(vector.dy, `${label}.dy`),
    };
};

const parseStringArray = (value: unknown, label: string): string[] => {
    if (!Array.isArray(value)) {
        throw new Error(`${label} must be an array.`);
    }

    return value.map((item, index) => requireString(item, `${label}[${index}]`));
};

const parseConnection = (value: unknown, label: string): [number, number] => {
    if (!Array.isArray(value) || value.length !== 2) {
        throw new Error(`${label} must be a pair of landmark indexes.`);
    }

    return [
        requireInteger(value[0], `${label}[0]`),
        requireInteger(value[1], `${label}[1]`),
    ];
};

const parsePoseLandmark = (value: unknown, label: string): PoseLandmark | null => {
    if (value === null) {
        return null;
    }

    const landmark = requireRecord(value, label);

    return {
        x: requireFiniteNumber(landmark.x, `${label}.x`),
        y: requireFiniteNumber(landmark.y, `${label}.y`),
        z: landmark.z == null ? null : requireFiniteNumber(landmark.z, `${label}.z`),
        visibility: landmark.visibility == null ? null : requireFiniteNumber(landmark.visibility, `${label}.visibility`),
        presence: landmark.presence == null ? null : requireFiniteNumber(landmark.presence, `${label}.presence`),
    };
};

const parsePoseFrame = (value: unknown, index: number): PoseFrame => {
    const frame = requireRecord(value, `pose.frames[${index}]`);
    const landmarksValue = frame.landmarks;

    if (landmarksValue !== null && !Array.isArray(landmarksValue)) {
        throw new Error(`pose.frames[${index}].landmarks must be an array or null.`);
    }

    return {
        frameIndex: requireInteger(frame.frame_index, `pose.frames[${index}].frame_index`),
        timestampSeconds: requireFiniteNumber(frame.timestamp_seconds, `pose.frames[${index}].timestamp_seconds`),
        landmarks: landmarksValue === null
            ? null
            : landmarksValue.map((landmark, landmarkIndex) => parsePoseLandmark(
                landmark,
                `pose.frames[${index}].landmarks[${landmarkIndex}]`,
            )),
    };
};

const parsePose = (value: unknown): PoseMetadata => {
    const pose = requireRecord(value, 'pose');
    const coordinateSpace = requireRecord(pose.coordinate_space, 'pose.coordinate_space');

    if (!Array.isArray(pose.skeleton_connections)) {
        throw new Error('pose.skeleton_connections must be an array.');
    }

    if (!Array.isArray(pose.frames)) {
        throw new Error('pose.frames must be an array.');
    }

    return {
        landmarkModel: requireString(pose.landmark_model, 'pose.landmark_model'),
        landmarkCount: requireInteger(pose.landmark_count, 'pose.landmark_count'),
        landmarkNames: parseStringArray(pose.landmark_names, 'pose.landmark_names'),
        renderLandmarksSource: requireString(pose.render_landmarks_source, 'pose.render_landmarks_source'),
        coordinateSpace: {
            width: requireInteger(coordinateSpace.width, 'pose.coordinate_space.width'),
            height: requireInteger(coordinateSpace.height, 'pose.coordinate_space.height'),
        },
        skeletonConnections: pose.skeleton_connections.map((connection, index) => parseConnection(connection, `pose.skeleton_connections[${index}]`)),
        frames: pose.frames.map((frame, index) => parsePoseFrame(frame, index)),
    };
};

const parseVelocityPreset = (name: string, value: unknown): VelocityColorPreset => {
    const preset = requireRecord(value, `style.velocity_color_presets.${name}`);

    return {
        colorSpace: requireString(preset.color_space, `style.velocity_color_presets.${name}.color_space`),
        interpolation: requireString(preset.interpolation, `style.velocity_color_presets.${name}.interpolation`),
        slowBgr: requireColorTriplet(preset.slow_bgr, `style.velocity_color_presets.${name}.slow_bgr`),
        midBgr: requireColorTriplet(preset.mid_bgr, `style.velocity_color_presets.${name}.mid_bgr`),
        fastBgr: requireColorTriplet(preset.fast_bgr, `style.velocity_color_presets.${name}.fast_bgr`),
    };
};

const parseSample = (value: unknown, trackName: string, index: number): TrajectorySample => {
    const sample = requireRecord(value, `tracks.${trackName}.samples[${index}]`);

    return {
        frameIndex: requireInteger(sample.frame_index, `tracks.${trackName}.samples[${index}].frame_index`),
        timestampSeconds: requireFiniteNumber(sample.timestamp_seconds, `tracks.${trackName}.samples[${index}].timestamp_seconds`),
        point: parsePoint(sample.point, `tracks.${trackName}.samples[${index}].point`),
        velocityRatio: sample.velocity_ratio === null || sample.velocity_ratio === undefined
            ? null
            : requireFiniteNumber(sample.velocity_ratio, `tracks.${trackName}.samples[${index}].velocity_ratio`),
        velocityVector2D: parseVector2D(
            sample.velocity_vector_2d,
            `tracks.${trackName}.samples[${index}].velocity_vector_2d`,
        ),
        velocityVector2DPerSecond: parseVector2D(
            sample.velocity_vector_2d_per_second,
            `tracks.${trackName}.samples[${index}].velocity_vector_2d_per_second`,
        ),
    };
};

const parseTrack = (name: string, value: unknown): TrajectoryTrack => {
    const track = requireRecord(value, `tracks.${name}`);
    const samples = track.samples;

    if (!Array.isArray(samples)) {
        throw new Error(`tracks.${name}.samples must be an array.`);
    }

    return {
        velocityColorPreset: track.velocity_color_preset == null
            ? null
            : requireString(track.velocity_color_preset, `tracks.${name}.velocity_color_preset`),
        samples: samples.map((sample, index) => parseSample(sample, name, index)),
    };
};

export const parseTrajectoryMetadata = (rawText: string): ParsedTrajectoryMetadata => {
    let parsedJson: unknown;

    try {
        parsedJson = JSON.parse(rawText);
    } catch {
        throw new Error('Metadata file must be valid JSON.');
    }

    const root = requireRecord(parsedJson, 'Metadata');
    const sourceVideo = parseSourceVideo(root.source_video, 'source_video');
    const coordinateSpace = parseCoordinateSpace(root.coordinate_space, 'coordinate_space');
    const style = requireRecord(root.style, 'style');
    const tracksInput = requireRecord(root.tracks, 'tracks');
    const presetsInput = requireRecord(style.velocity_color_presets, 'style.velocity_color_presets');
    const pose = root.pose == null ? null : parsePose(root.pose);

    const metadata: TrajectoryMetadata = {
        schemaVersion: requireString(root.schema_version, 'schema_version'),
        sourceVideo,
        coordinateSpace,
        style: {
            defaultVelocityColorPreset: requireString(
                style.default_velocity_color_preset,
                'style.default_velocity_color_preset',
            ),
            velocityColorPresets: Object.fromEntries(
                Object.entries(presetsInput).map(([name, preset]) => [name, parseVelocityPreset(name, preset)]),
            ),
        },
        tracks: Object.fromEntries(
            Object.entries(tracksInput).map(([name, track]) => [name, parseTrack(name, track)]),
        ),
        pose,
    };

    if (Object.keys(metadata.tracks).length === 0) {
        throw new Error('tracks must contain at least one named track.');
    }

    if (Object.keys(metadata.style.velocityColorPresets).length === 0) {
        throw new Error('style.velocity_color_presets must contain at least one preset.');
    }

    const warnings: string[] = [];

    if (metadata.schemaVersion !== '1.0') {
        warnings.push(`Schema version ${metadata.schemaVersion} is not the current 1.0 contract.`);
    }

    if (metadata.coordinateSpace.type !== 'pixel') {
        warnings.push(`coordinate_space.type is ${metadata.coordinateSpace.type}; only pixel coordinates are currently supported.`);
    }

    if (metadata.coordinateSpace.origin !== 'top_left') {
        warnings.push(`coordinate_space.origin is ${metadata.coordinateSpace.origin}; overlay assumes top_left.`);
    }

    if (metadata.coordinateSpace.xAxis !== 'right' || metadata.coordinateSpace.yAxis !== 'down') {
        warnings.push('coordinate_space axis directions are not the expected right/down mapping.');
    }

    if (
        metadata.coordinateSpace.width !== metadata.sourceVideo.width
        || metadata.coordinateSpace.height !== metadata.sourceVideo.height
    ) {
        warnings.push('Coordinate space dimensions do not match source_video dimensions.');
    }

    if (!(metadata.style.defaultVelocityColorPreset in metadata.style.velocityColorPresets)) {
        warnings.push(`Default velocity color preset ${metadata.style.defaultVelocityColorPreset} is missing from style.velocity_color_presets.`);
    }

    Object.entries(metadata.style.velocityColorPresets).forEach(([presetName, preset]) => {
        if (preset.colorSpace !== 'bgr') {
            warnings.push(`Preset ${presetName} uses color_space ${preset.colorSpace}; only bgr conversion is currently supported.`);
        }

        if (preset.interpolation !== 'three_stop_linear_bgr') {
            warnings.push(`Preset ${presetName} uses interpolation ${preset.interpolation}; renderer currently expects three_stop_linear_bgr.`);
        }
    });

    Object.entries(metadata.tracks).forEach(([trackName, track]) => {
        if (track.velocityColorPreset && !(track.velocityColorPreset in metadata.style.velocityColorPresets)) {
            warnings.push(`Track ${trackName} references unknown preset ${track.velocityColorPreset}; renderer will fall back to the default preset.`);
        }
    });

    if (metadata.pose) {
        if (metadata.pose.landmarkNames.length !== metadata.pose.landmarkCount) {
            warnings.push('pose.landmark_names length does not match pose.landmark_count.');
        }

        if (
            metadata.pose.coordinateSpace.width !== metadata.sourceVideo.width
            || metadata.pose.coordinateSpace.height !== metadata.sourceVideo.height
        ) {
            warnings.push('pose.coordinate_space dimensions do not match source_video dimensions.');
        }

        metadata.pose.frames.forEach((frame, index) => {
            if (frame.landmarks && frame.landmarks.length !== metadata.pose?.landmarkCount) {
                warnings.push(`pose.frames[${index}].landmarks length does not match pose.landmark_count.`);
            }
        });
    }

    return {
        metadata,
        warnings,
    };
};