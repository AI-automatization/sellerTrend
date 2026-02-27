import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs text-base-content/50">{label}</p>
        {icon && <span className="text-base-content/30">{icon}</span>}
      </div>
      <p className={`font-bold text-lg tabular-nums leading-tight ${accent ?? ''}`}>{value}</p>
      {sub && <p className="text-xs text-base-content/40 mt-0.5">{sub}</p>}
    </div>
  );
}
