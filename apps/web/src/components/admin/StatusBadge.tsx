// ─── StatusBadge ─────────────────────────────────────────────────────────────

import type { Account } from './types';

export interface StatusBadgeProps {
  status: Account['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map = {
    ACTIVE: 'bg-success/15 text-success border-success/20',
    PAYMENT_DUE: 'bg-error/15 text-error border-error/20',
    SUSPENDED: 'bg-base-300/50 text-base-content/40 border-base-300',
  };
  const labels = { ACTIVE: 'Faol', PAYMENT_DUE: "To'lov kerak", SUSPENDED: 'Bloklangan' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${map[status]}`}>{labels[status]}</span>;
}
