import type { Run } from './types';

interface StatusBadgeProps {
  status: Run['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map = { PENDING: 'badge-warning', RUNNING: 'badge-info', DONE: 'badge-success', FAILED: 'badge-error' };
  const labels = { PENDING: 'Kutmoqda', RUNNING: 'Ishlayapti', DONE: 'Tayyor', FAILED: 'Xato' };
  return (
    <span className={`badge badge-sm ${map[status]}`}>
      {status === 'RUNNING' && <span className="loading loading-spinner loading-xs mr-1" />}
      {labels[status]}
    </span>
  );
}
