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

- `app/page.tsx` for the main orchestration.
- `app/components/VideoDropzone.tsx` for local file loading.
- `app/components/VideoControlPanel.tsx` for sliders and key moments.
- `app/hooks/useKeyboardShortcuts.ts` for reusable shortcut bindings.

Build with:

```bash
npm run build
```
