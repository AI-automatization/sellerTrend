interface ScoreMeterProps {
  score: number;
}

export function ScoreMeter({ score }: ScoreMeterProps) {
  const segments = [
    { label: 'Zaif', max: 3, color: 'bg-error' },
    { label: "O'rtacha", max: 5, color: 'bg-warning' },
    { label: 'Yaxshi', max: 7, color: 'bg-success' },
    { label: 'Zo\'r', max: 10, color: 'bg-primary' },
  ];
  const active = segments.findIndex((s) => score <= s.max);
  const seg = segments[active === -1 ? 3 : active];
  return (
    <div className="space-y-1">
      <div className="flex gap-1 h-2">
        {segments.map((s, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full ${i <= (active === -1 ? 3 : active) ? s.color : 'bg-base-300'} opacity-${i === (active === -1 ? 3 : active) ? '100' : '50'}`}
          />
        ))}
      </div>
      <p className="text-xs text-base-content/50 text-right">{seg.label} daraja</p>
    </div>
  );
}
