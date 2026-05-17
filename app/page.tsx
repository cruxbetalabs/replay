'use client';

import { useViewportSupported } from './hooks/useViewportSupported';
import { ReplayComparisonStudio } from './components/replay/ReplayComparisonStudio';

export default function Home() {
  const viewport = useViewportSupported();
  if (viewport === null) return null;

  const { supported, reason } = viewport;
  if (!supported) {
    const message =
      reason === 'mobile'
        ? { heading: 'Desktop only', body: 'Replay is designed for desktop and iPad. Please open it on a larger screen.' }
        : { heading: 'Rotate to landscape', body: 'Replay requires landscape orientation. Please rotate your device to continue.' };

    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background p-8 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-lg font-semibold">{message.heading}</p>
          <p className="text-sm text-muted-foreground">{message.body}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <ReplayComparisonStudio />
    </div>
  );
}
