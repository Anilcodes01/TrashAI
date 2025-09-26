"use client";

interface ProgressBarProps {
  progress: number;
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="w-full bg-zinc-700 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-green-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${clampedProgress}%` }}
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-sm font-medium text-zinc-300">
        {`${Math.round(clampedProgress)}%`}
      </span>
    </div>
  );
}