'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Activity, BookmarkPlus, Check, Copy, Download, Film, PersonStanding, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// ─── Sub-components ──────────────────────────────────────────────────────────

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-3">
            <div className="shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                {number}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">{title}</p>
                <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed space-y-2">
                    {children}
                </div>
            </div>
        </div>
    );
}

function InlineCode({ children }: { children: React.ReactNode }) {
    return (
        <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono text-xs text-gray-700 dark:text-gray-300">
            {children}
        </code>
    );
}

function formatVideoPathArg(videoPath: string): string {
    const trimmed = videoPath.trim() || 'climb.mp4';
    return `"${trimmed.replace(/"/g, '\\"')}"`;
}

function buildCruxesCommandLines(videoPath: string): string[] {
    const pathArg = formatVideoPathArg(videoPath);
    return [
        'cruxes body-trajectory \\',
        '  --pose_backend "mediapipe" \\',
        '  --smooth "gaussian" \\',
        `  --video_path ${pathArg} \\`,
        '  --export_metadata \\',
        '  --json_only',
    ];
}

function CodeBlock({ lines }: { lines: string[] }) {
    const code = lines.join('\n');
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            toast.success('Command copied to clipboard');
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Could not copy to clipboard');
        }
    }, [code]);

    return (
        <div className="relative mt-1.5 w-80 max-w-full">
            <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleCopy}
                className="absolute top-1.5 right-1.5 z-10 size-7 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="Copy command"
            >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
            <pre className="px-3 py-2.5 pr-10 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre leading-5">
                {code}
            </pre>
        </div>
    );
}

function FeatureRow({ icon, label, desc }: { icon: React.ReactElement<{ className?: string }>; label: string; desc: string }) {
    const sized = React.cloneElement(icon, { className: 'w-6 h-6 text-blue-400 dark:text-blue-500' });
    return (
        <div className="flex items-start gap-2.5">
            <div className="shrink-0 mt-0.5">{sized}</div>
            <div>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">{label}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingContent() {
    const [videoPath, setVideoPath] = useState('climb.mp4');
    const commandLines = useMemo(() => buildCruxesCommandLines(videoPath), [videoPath]);

    return (
        <div className="p-7 flex flex-col gap-5 mb-10">
            {/* Header */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-1.5">
                    Get started
                </p>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Analyze your climb
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Drop two climbing videos to compare them side-by-side. Generate a metadata file with{' '}
                    <InlineCode>cruxes</InlineCode> to unlock overlay panels for trajectories and pose.
                </p>
            </div>

            {/* Footer link */}
            <div className="pt-0">
                <a
                    href="https://pypi.org/project/cruxes/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    <Download className="w-3 h-3" />
                    <code className="font-mono">cruxes</code> on PyPI
                </a>
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-800" />

            {/* Steps */}
            <div className="flex flex-col gap-4">
                <Step number={1} title="Install cruxes">
                    <p>
                        Requires Python 3.11+. Install the CLI from PyPI:
                    </p>
                    <CodeBlock lines={[
                        'pip install --upgrade cruxes'
                    ]} />
                    <p>
                        or if you use <a
                            href="https://pipx.pypa.io/stable/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >pipx</a>:

                    </p>
                    <CodeBlock lines={[
                        'pipx install --upgrade cruxes',
                    ]} />
                </Step>

                <Step number={2} title="Record your climb">
                    <p>
                        Capture your session with any standard camera. Supported video formats:{' '}
                        <InlineCode>.mp4</InlineCode> and <InlineCode>.mov</InlineCode>.
                    </p>
                    <p>
                        For best results, keep the camera fixed so the scene stays consistent across both videos.
                    </p>
                </Step>

                <Step number={3} title="Generate overlay metadata">
                    <p>
                        Run <InlineCode>cruxes body-trajectory</InlineCode> on your video to extract pose and
                        trajectory data:
                    </p>
                    <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Video file path
                        </span>
                        <Input
                            type="text"
                            value={videoPath}
                            onChange={(event) => setVideoPath(event.target.value)}
                            placeholder="climb.mp4 or /path/to/your/video.mp4"
                            className="w-80 max-w-full font-mono text-xs"
                            spellCheck={false}
                        />
                    </label>
                    <CodeBlock lines={commandLines} />
                    <p>
                        This writes a <InlineCode>climb_trajectory_metadata.json</InlineCode> file next to your
                        video. Repeat for your second video.
                    </p>
                </Step>

                <Step number={4} title="Upload to Replay">
                    <p>
                        Drag and drop each <InlineCode>.mp4</InlineCode> / <InlineCode>.mov</InlineCode> video
                        and its matching <InlineCode>.json</InlineCode> metadata file onto the left or right
                        video dropzone.
                    </p>
                    <p>
                        You can drop both files at once — Replay will automatically pair the video and metadata.
                    </p>
                </Step>
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-800" />

            {/* What you'll unlock */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
                    What you&apos;ll see after uploading
                </p>
                <div className="flex flex-col gap-3">
                    <FeatureRow
                        icon={<PlayCircle />}
                        label="Video playback controls"
                        desc="Scrub, seek, and step frame-by-frame across both videos in sync."
                    />
                    <FeatureRow
                        icon={<Activity />}
                        label="Body trajectory overlay"
                        desc="Visualize movement paths for hip, hands, feet, and more over time."
                    />
                    <FeatureRow
                        icon={<PersonStanding />}
                        label="Pose skeleton overlay"
                        desc="See the estimated body pose rendered frame-by-frame on top of the video."
                    />
                    <FeatureRow
                        icon={<BookmarkPlus />}
                        label="Key moment timeline"
                        desc="Pin important frames and jump between them across both videos."
                    />
                    <FeatureRow
                        icon={<Film />}
                        label="Side-by-side comparison"
                        desc="Swipe or overlay both videos to compare form across different sessions."
                    />
                </div>
            </div>

        </div>
    );
}
