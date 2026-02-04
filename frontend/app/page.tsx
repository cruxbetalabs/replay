'use client';

import { useMemo, useRef, useState } from 'react';
import { MouseControlPanel } from './components/MouseControlPanel';
import { VideoControlPanel } from './components/VideoControlPanel';
import { VideoDropzone } from './components/VideoDropzone';
import { useMouseControl } from './hooks/useMouseControl';
import { useVideoControl } from './hooks/useVideoControl';
import { useVideoFps } from './hooks/useVideoFps';

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoUrl2, setVideoUrl2] = useState<string | null>(null);
  const [isUploading1, setIsUploading1] = useState(false);
  const [isUploading2, setIsUploading2] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setIsUploading1(true);
      // Upload to server
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('http://localhost:5050/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success && data.url) {
          // Use the server URL
          const fullUrl = `http://localhost:5050${data.url}`;
          setVideoUrl(fullUrl);
        } else {
          console.error('Upload failed:', data.message);
          // Fallback to local URL
          const url = URL.createObjectURL(file);
          setVideoUrl(url);
        }
      } catch (error) {
        console.error('Upload error:', error);
        // Fallback to local URL
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
      } finally {
        setIsUploading1(false);
      }
    }
  };

  const handleFileUpload2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setIsUploading2(true);
      // Upload to server
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('http://localhost:5050/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success && data.url) {
          // Use the server URL
          const fullUrl = `http://localhost:5050${data.url}`;
          setVideoUrl2(fullUrl);
        } else {
          console.error('Upload failed:', data.message);
          // Fallback to local URL
          const url = URL.createObjectURL(file);
          setVideoUrl2(url);
        }
      } catch (error) {
        console.error('Upload error:', error);
        // Fallback to local URL
        const url = URL.createObjectURL(file);
        setVideoUrl2(url);
      } finally {
        setIsUploading2(false);
      }
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
            isUploading={isUploading1}
          />
          <VideoDropzone
            label="Video 2"
            videoUrl={videoUrl2}
            ref={videoRef2}
            onUpload={handleFileUpload2}
            isCalculating={calculatingByIndex[1]}
            isUploading={isUploading2}
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
          onSeek1={seekTo1}
          onSeek2={seekTo2}
          onRemoveVideo1={() => setVideoUrl(null)}
          onRemoveVideo2={() => setVideoUrl2(null)}
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
