interface ScorePillProps {
  score: number | null;
}

export function ScorePill({ score }: ScorePillProps) {
  if (score === null) return <span className="text-base-content/20 text-xs">—</span>;
  const cls =
    score >= 6 ? 'bg-success/12 text-success border-success/15'
    : score >= 4 ? 'bg-warning/12 text-warning border-warning/15'
    : 'bg-base-300/50 text-base-content/40 border-base-300/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-[10px] text-[11px] font-bold tabular-nums border ${cls}`}>
      {score.toFixed(2)}
    </span>
  );
}
