import { useI18n } from '../../i18n/I18nContext';

interface TrendBadgeProps {
  trend: 'up' | 'flat' | 'down';
  changePct?: number;
}

export function TrendBadge({ trend, changePct }: TrendBadgeProps) {
  const { t } = useI18n();

  const pctStr = changePct != null && changePct !== 0
    ? ` ${changePct > 0 ? '+' : ''}${(changePct * 100).toFixed(1)}%`
    : '';

  if (trend === 'up')
    return <span className="badge badge-success">&#x2197; {t('product.trend.rising')}{pctStr}</span>;
  if (trend === 'down')
    return <span className="badge badge-error">&#x2198; {t('product.trend.falling')}{pctStr}</span>;
  return <span className="badge badge-ghost">&rarr; {t('product.trend.stable')}{pctStr}</span>;
}
