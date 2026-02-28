import { useI18n } from '../../i18n/I18nContext';

export interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();
  const cls =
    status === 'DONE' ? 'badge-success' :
    status === 'RUNNING' ? 'badge-warning' :
    status === 'FAILED' ? 'badge-error' : 'badge-ghost';

  const label =
    status === 'DONE' ? t('discovery.status.done') :
    status === 'RUNNING' ? t('discovery.status.running') :
    status === 'FAILED' ? t('discovery.status.failed') :
    status === 'PENDING' ? t('discovery.status.pending') : status;

  return <span className={`badge badge-sm ${cls}`}>{label}</span>;
}
