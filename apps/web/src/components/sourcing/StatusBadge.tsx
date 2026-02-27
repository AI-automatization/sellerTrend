export interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls =
    status === 'DONE' ? 'badge-success' :
    status === 'RUNNING' ? 'badge-warning' :
    status === 'FAILED' ? 'badge-error' : 'badge-ghost';
  return <span className={`badge badge-sm ${cls}`}>{status}</span>;
}
