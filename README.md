This frontend is a browser-local video comparison tool built with [Next.js](https://nextjs.org).

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app loads videos directly into the browser with blob URLs. There is no backend required for playback, scrubbing, or key-moment editing.

Main behavior:

- Load two local videos by click or drag-and-drop.
- Scrub both videos in sync.
- Add and edit key moments per video.
- Jump to key moments with the UI or number keys `1` through `9`.

Relevant files:

- `app/page.tsx` for page composition and layout.
- `app/hooks/useVideoSources.ts` for local video URL lifecycle.
- `app/hooks/useKeyMoments.ts` for key-moment state and actions.
- `app/hooks/useTrajectoryState.ts` for metadata upload and compatibility.
- `app/lib/trajectory-parser.ts` and `app/lib/trajectory-compatibility.ts` for focused trajectory utilities.
- `app/components/VideoDropzone.tsx` and `app/components/OverlayComparisonStage.tsx` for the main comparison surfaces.

Build with:

```bash
npm run build
```

## Playback & Overlay Alignment

The `<video>` element is the single source of truth for current playback position. There is no shared React state between the video and the trajectory overlay — they stay in sync because the overlay always reads `videoRef.current.currentTime` directly at draw time.

### How it works

**React state (`currentTime1 / currentTime2` in `useVideoControl`)** is UI-only. It is updated immediately on slider drag so the scrubber stays responsive, but the overlay never reads these values. Actual seeks are rAF-coalesced. **Chromium** uses `fastSeek()` during drag (one seek per frame, no blocking on `seeked`) and a precise `currentTime` commit when the slider is released. **Safari** uses coalesced precise `currentTime` seeks (never `fastSeek`, which snaps to keyframes) with `seeked` catch-up so the decoder applies the latest scrub target as soon as each frame finishes decoding; videos use `preload="auto"` on Safari to buffer adjacent frames.

**`TrajectoryOverlay` is event-driven, not prop-driven.** It attaches listeners directly to the `<video>` DOM element and draws into a `<canvas>` positioned on top of the video:

| Event | Overlay response |
|-------|-----------------|
| `play` | Start render loop (rVFC or rAF) |
| `pause` | Stop loop, draw one final frame |
| `seeked` | `renderOnce()` — redraw once the decoded pixel frame is ready (keeps overlay aligned with video during scrubbing) |
| `ResizeObserver` | `renderOnce()` on container resize or DPR change |

**Render loop strategy:**
- If `requestVideoFrameCallback` (rVFC) is available, the overlay fires exactly once per decoded video frame — perfectly GPU-synced with zero wasted work while paused.
- Otherwise it falls back to a plain `requestAnimationFrame` loop that only runs while the video is playing.

**Pre-computation:** `maxVelocityByTrack` (used to normalize arrow lengths) is computed once via `useMemo` keyed on `metadata`, not on every frame or every render-loop tick.

Relevant files:

- `app/components/TrajectoryOverlay.tsx` — canvas rendering, event listeners, render loop
- `app/hooks/useVideoControl.ts` — rAF-throttled seeking, playback state for the UI
- `app/hooks/useOverlaySettings.ts` — overlay visibility toggles (trajectory, pose, history window)
