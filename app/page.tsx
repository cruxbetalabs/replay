'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MouseControlPanel } from './components/MouseControlPanel';
import { VideoControlPanel } from './components/VideoControlPanel';
import { VideoDropzone } from './components/VideoDropzone';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMouseControl } from './hooks/useMouseControl';
import { useVideoControl } from './hooks/useVideoControl';
import { useVideoFps } from './hooks/useVideoFps';

interface KeyMomentPosition {
  time: number;
  frame: number;
}

interface KeyMoment {
  id: string;
  positions: [KeyMomentPosition | null, KeyMomentPosition | null];
}

const DEFAULT_FPS = 30;

const getFrameAtTime = (time: number, fps: number | null) => Math.max(0, Math.round(time * (fps ?? DEFAULT_FPS)));

const buildKeyMomentPosition = (time: number, fps: number | null): KeyMomentPosition => ({
  time,
  frame: getFrameAtTime(time, fps),
});

const revokeObjectUrl = (url: string | null) => {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoUrl2, setVideoUrl2] = useState<string | null>(null);
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([]);
  const [selectedKeyMomentId, setSelectedKeyMomentId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string | null>(null);
  const videoUrl2Ref = useRef<string | null>(null);

  const videoRefs = useMemo(() => [videoRef, videoRef2], []);
  const videoUrls = useMemo(() => [videoUrl, videoUrl2], [videoUrl, videoUrl2]);

  const { boxRef, direction, speed, movement, controlMode } = useMouseControl({ controlMode: 'both' });
  const { fps, fpsByIndex, calculatingByIndex } = useVideoFps({
    videoRefs,
    videoUrls,
  });

  const fps1 = fpsByIndex[0];
  const fps2 = fpsByIndex[1];
  const seekAmount1 = fps1 ? 1 / fps1 : 1 / 30;
  const seekAmount2 = fps2 ? 1 / fps2 : 1 / 30;

  const { currentTime1, currentTime2, duration1, duration2, seekTo1, seekTo2 } = useVideoControl({
    videoRefs,
    videoUrls,
    direction,
    movement,
    fps,
  });

  const createKeyMomentFromVideo = (sourceIndex: 0 | 1) => {
    const sourceTime = sourceIndex === 0 ? currentTime1 : currentTime2;
    const nextKeyMomentId = crypto.randomUUID();

    setSelectedKeyMomentId(nextKeyMomentId);

    setKeyMoments((prev) => [
      ...prev,
      {
        id: nextKeyMomentId,
        positions: [
          videoUrl ? buildKeyMomentPosition(sourceTime, fps1) : null,
          videoUrl2 ? buildKeyMomentPosition(sourceTime, fps2) : null,
        ],
      },
    ]);
  };

  const updateKeyMomentFromVideo = (keyMomentId: string, sourceIndex: 0 | 1) => {
    const sourceTime = sourceIndex === 0 ? currentTime1 : currentTime2;
    const sourceFps = sourceIndex === 0 ? fps1 : fps2;

    setKeyMoments((prev) => prev.map((keyMoment) => {
      if (keyMoment.id !== keyMomentId) {
        return keyMoment;
      }

      const nextPositions: [KeyMomentPosition | null, KeyMomentPosition | null] = [...keyMoment.positions];
      nextPositions[sourceIndex] = buildKeyMomentPosition(sourceTime, sourceFps);

      return {
        ...keyMoment,
        positions: nextPositions,
      };
    }));
  };

  const jumpToKeyMoment = useCallback((keyMomentId: string) => {
    const keyMoment = keyMoments.find((entry) => entry.id === keyMomentId);
    if (!keyMoment) {
      return;
    }

    setSelectedKeyMomentId(keyMomentId);

    videoRef.current?.pause();
    videoRef2.current?.pause();

    const position1 = keyMoment.positions[0];
    const position2 = keyMoment.positions[1];

    if (position1 && videoUrl) {
      seekTo1(position1.time);
    }

    if (position2 && videoUrl2) {
      seekTo2(position2.time);
    }
  }, [keyMoments, seekTo1, seekTo2, videoUrl, videoUrl2]);

  const keyMomentShortcuts = useMemo(() => keyMoments.slice(0, 9).map((keyMoment, index) => ({
    key: String(index + 1),
    onTrigger: () => jumpToKeyMoment(keyMoment.id),
  })), [jumpToKeyMoment, keyMoments]);

  useKeyboardShortcuts({
    shortcuts: keyMomentShortcuts,
    enabled: keyMoments.length > 0,
  });

  const deleteKeyMoment = (keyMomentId: string) => {
    setKeyMoments((prev) => prev.filter((keyMoment) => keyMoment.id !== keyMomentId));
    setSelectedKeyMomentId((prev) => (prev === keyMomentId ? null : prev));
  };

  const setKeyMomentTime = (keyMomentId: string, videoIndex: 0 | 1, nextTime: number) => {
    const videoDuration = videoIndex === 0 ? duration1 : duration2;
    const boundedTime = Math.max(0, Math.min(nextTime, videoDuration || nextTime));
    const sourceFps = videoIndex === 0 ? fps1 : fps2;

    setSelectedKeyMomentId(keyMomentId);
    setKeyMoments((prev) => prev.map((keyMoment) => {
      if (keyMoment.id !== keyMomentId) {
        return keyMoment;
      }

      const nextPositions: [KeyMomentPosition | null, KeyMomentPosition | null] = [...keyMoment.positions];
      nextPositions[videoIndex] = buildKeyMomentPosition(boundedTime, sourceFps);

      return {
        ...keyMoment,
        positions: nextPositions,
      };
    }));

    videoRef.current?.pause();
    videoRef2.current?.pause();

    if (videoIndex === 0 && videoUrl) {
      seekTo1(boundedTime);
    }

    if (videoIndex === 1 && videoUrl2) {
      seekTo2(boundedTime);
    }
  };

  const clearVideoKeyMoments = (videoIndex: 0 | 1) => {
    setKeyMoments((prev) => {
      const nextKeyMoments = prev
        .map((keyMoment) => {
          const nextPositions: [KeyMomentPosition | null, KeyMomentPosition | null] = [...keyMoment.positions];
          nextPositions[videoIndex] = null;

          return {
            ...keyMoment,
            positions: nextPositions,
          };
        })
        .filter((keyMoment) => keyMoment.positions.some(Boolean));

      setSelectedKeyMomentId((currentSelectedId) => {
        if (!currentSelectedId) {
          return currentSelectedId;
        }

        return nextKeyMoments.some((keyMoment) => keyMoment.id === currentSelectedId) ? currentSelectedId : null;
      });

      return nextKeyMoments;
    });
  };

  useEffect(() => {
    videoUrlRef.current = videoUrl;
  }, [videoUrl]);

  useEffect(() => {
    videoUrl2Ref.current = videoUrl2;
  }, [videoUrl2]);

  useEffect(() => {
    return () => {
      revokeObjectUrl(videoUrlRef.current);
      revokeObjectUrl(videoUrl2Ref.current);
    };
  }, []);

  const replaceVideoUrl = (videoIndex: 0 | 1, nextUrl: string) => {
    if (videoIndex === 0) {
      revokeObjectUrl(videoUrlRef.current);
      setVideoUrl(nextUrl);
      clearVideoKeyMoments(0);
      return;
    }

    revokeObjectUrl(videoUrl2Ref.current);
    setVideoUrl2(nextUrl);
    clearVideoKeyMoments(1);
  };

  const handleRemoveVideo1 = () => {
    revokeObjectUrl(videoUrlRef.current);
    setVideoUrl(null);
    clearVideoKeyMoments(0);
  };

  const handleRemoveVideo2 = () => {
    revokeObjectUrl(videoUrl2Ref.current);
    setVideoUrl2(null);
    clearVideoKeyMoments(1);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      replaceVideoUrl(0, URL.createObjectURL(file));
    }
  };

  const handleFileUpload2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      replaceVideoUrl(1, URL.createObjectURL(file));
    }
  };

  const hasVideos = !!(videoUrl || videoUrl2);


  return (
    <div className="flex h-screen w-screen bg-zinc-50 font-sans dark:bg-black overflow-hidden">
      {/* Left Side - Video Area (2/3 width) */}
      <div className="w-2/3 h-full flex flex-col p-8 gap-6 bg-white dark:bg-black">
        {/* Video Display Area - Two Videos Side by Side */}
        <div className="flex gap-4 min-h-0" style={{ height: 'calc(100% - 10rem)' }}>
          <VideoDropzone
            label="Video 1"
            videoUrl={videoUrl}
            ref={videoRef}
            onUpload={handleFileUpload}
            isCalculating={calculatingByIndex[0]}
          />
          <VideoDropzone
            label="Video 2"
            videoUrl={videoUrl2}
            ref={videoRef2}
            onUpload={handleFileUpload2}
            isCalculating={calculatingByIndex[1]}
          />
        </div>

        {/* Designated Swipe Control Area */}
        <MouseControlPanel
          boxRef={boxRef}
          direction={direction}
          controlMode={controlMode}
        />
      </div>

      {/* Right Side - Controls & Stats Area (1/3 width) */}
      <div className="w-1/3 h-full flex flex-col p-8 gap-6 bg-gray-50 dark:bg-gray-950 border-l-4 border-gray-300 dark:border-gray-700 overflow-y-auto">
        <VideoControlPanel
          hasVideos={hasVideos}
          hasVideo1={!!videoUrl}
          hasVideo2={!!videoUrl2}
          duration1={duration1}
          duration2={duration2}
          currentTime1={currentTime1}
          currentTime2={currentTime2}
          fps1={fps1}
          fps2={fps2}
          seekAmount1={seekAmount1}
          seekAmount2={seekAmount2}
          keyMoments={keyMoments}
          selectedKeyMomentId={selectedKeyMomentId}
          onSeek1={seekTo1}
          onSeek2={seekTo2}
          onCreateKeyMomentFromVideo1={() => createKeyMomentFromVideo(0)}
          onCreateKeyMomentFromVideo2={() => createKeyMomentFromVideo(1)}
          onJumpToKeyMoment={jumpToKeyMoment}
          onSelectKeyMoment={jumpToKeyMoment}
          onSetKeyMomentTime1={(keyMomentId, time) => setKeyMomentTime(keyMomentId, 0, time)}
          onSetKeyMomentTime2={(keyMomentId, time) => setKeyMomentTime(keyMomentId, 1, time)}
          onUpdateKeyMomentFromVideo1={(keyMomentId) => updateKeyMomentFromVideo(keyMomentId, 0)}
          onUpdateKeyMomentFromVideo2={(keyMomentId) => updateKeyMomentFromVideo(keyMomentId, 1)}
          onDeleteKeyMoment={deleteKeyMoment}
          onRemoveVideo1={handleRemoveVideo1}
          onRemoveVideo2={handleRemoveVideo2}
        />

        {/* Stats Display */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg flex-1">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            Swipe Stats
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                  Direction
                </span>
                <span className={`px-3 py-1 rounded-full font-medium text-sm ${direction === 'left'
                  ? 'bg-purple-500 text-white'
                  : direction === 'right'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-400 text-white'
                  }`}>
                  {direction === 'left' ? '← Left' : direction === 'right' ? 'Right →' : 'None'}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                  Speed
                </span>
                <span className="text-gray-800 dark:text-gray-200 font-mono text-sm">
                  {speed.toFixed(1)} px/event
                </span>
              </div>
              <div className="w-full bg-gray-300 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-100"
                  style={{ width: `${Math.min(speed * 2, 100)}%` }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
