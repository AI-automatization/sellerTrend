interface ProgressBarProps {
  processed: number | null;
  total: number | null;
}

export function ProgressBar({ processed, total }: ProgressBarProps) {
  if (!total) return null;
  const pct = Math.min(Math.round(((processed ?? 0) / total) * 100), 100);
  return (
    <div className="flex items-center gap-2">
      <progress className="progress progress-info w-24 h-2" value={pct} max={100} />
      <span className="text-xs text-base-content/50">{pct}%</span>
    </div>
  );
}
