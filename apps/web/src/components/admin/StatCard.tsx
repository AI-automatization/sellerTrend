// ─── StatCard ────────────────────────────────────────────────────────────────

export interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <div className="bg-base-200 rounded-xl p-4 border border-base-300/50">
      <p className="text-xs text-base-content/50">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-base-content'}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-base-content/40 mt-0.5">{sub}</p>}
    </div>
  );
}
