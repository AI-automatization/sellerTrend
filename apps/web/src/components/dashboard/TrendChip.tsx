interface TrendChipProps {
  trend: 'up' | 'flat' | 'down' | null;
}

export function TrendChip({ trend }: TrendChipProps) {
  if (trend === 'up')
    return <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-success/10 text-success text-[10px] font-bold">↗</span>;
  if (trend === 'down')
    return <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-error/10 text-error text-[10px] font-bold">↘</span>;
  if (trend === 'flat')
    return <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-base-300/30 text-base-content/25 text-[10px]">→</span>;
  return <span className="text-base-content/10">—</span>;
}
