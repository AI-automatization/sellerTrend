interface ScoreBadgeProps {
  score: number | null;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === null) return <span className="text-base-content/30">—</span>;
  const color = score >= 6 ? 'text-success' : score >= 4 ? 'text-warning' : 'text-base-content/60';
  return <span className={`font-bold tabular-nums ${color}`}>{score.toFixed(2)}</span>;
}
