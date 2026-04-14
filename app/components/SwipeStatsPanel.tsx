'use client';

interface SwipeStatsPanelProps {
    direction: 'left' | 'right' | 'none';
    speed: number;
}

export function SwipeStatsPanel({
    direction,
    speed,
}: SwipeStatsPanelProps) {
    return (
        <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
            <h2 className="mb-4 text-xl font-bold text-gray-800 dark:text-gray-200">
                Swipe Stats
            </h2>

            <div className="space-y-4">
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Direction
                        </span>
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${direction === 'left'
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
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Speed
                        </span>
                        <span className="font-mono text-sm text-gray-800 dark:text-gray-200">
                            {speed.toFixed(1)} px/event
                        </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
                            style={{ width: `${Math.min(speed * 2, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}