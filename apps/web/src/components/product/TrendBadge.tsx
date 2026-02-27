interface TrendBadgeProps {
  trend: 'up' | 'flat' | 'down';
}

export function TrendBadge({ trend }: TrendBadgeProps) {
  if (trend === 'up') return <span className="badge badge-success">&#x2197; O'sayapti</span>;
  if (trend === 'down') return <span className="badge badge-error">&#x2198; Tushayapti</span>;
  return <span className="badge badge-ghost">&rarr; Barqaror</span>;
}
