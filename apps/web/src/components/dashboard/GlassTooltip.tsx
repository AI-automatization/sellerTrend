interface TooltipPayloadItem {
  value: number;
  name: string;
  color?: string;
  fill?: string;
}

export interface GlassTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  fmt?: (v: number, n: string) => string;
}

export function GlassTooltip({ active, payload, label, fmt }: GlassTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-base-100/95 backdrop-blur-xl border border-base-300/40 rounded-xl px-3.5 py-2.5 shadow-2xl">
      {label && <p className="text-[10px] text-base-content/35 mb-1.5 font-medium uppercase tracking-wide">{label}</p>}
      {payload.map((p, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-sm font-bold tabular-nums">{fmt ? fmt(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  );
}
