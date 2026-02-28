import { useI18n } from '../../i18n/I18nContext';
import type { Run } from './types';

interface StatusBadgeProps {
  status: Run['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();
  const map = { PENDING: 'badge-warning', RUNNING: 'badge-info', DONE: 'badge-success', FAILED: 'badge-error' };
  const labels: Record<string, string> = {
    PENDING: t('discovery.status.pending'),
    RUNNING: t('discovery.status.running'),
    DONE: t('discovery.status.done'),
    FAILED: t('discovery.status.failed'),
  };
  return (
    <span className={`badge badge-sm ${map[status]}`}>
      {status === 'RUNNING' && <span className="loading loading-spinner loading-xs mr-1" />}
      {labels[status]}
    </span>
  );
}
