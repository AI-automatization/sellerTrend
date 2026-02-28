import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { useI18n } from '../../i18n/I18nContext';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { EarlySignalItem } from './types';

export function EarlySignalsTab() {
  const { t } = useI18n();
  const [data, setData] = useState<EarlySignalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getEarlySignals()
      .then((r) => setData(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title={t('signals.early.title')}
        desc={t('signals.early.desc')}
      />
      {data.length === 0 ? (
        <EmptyState text={t('signals.early.empty')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>{t('signals.early.col.product')}</th>
                <th className="text-center">{t('signals.early.col.momentum')}</th>
                <th className="text-center">{t('signals.early.col.age')}</th>
                <th className="text-right">{t('signals.early.col.velocity')}</th>
                <th className="text-right">{t('signals.early.col.scoreGrowth')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.product_id} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[200px] truncate text-sm">{item.title}</td>
                  <td className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <progress className="progress progress-primary w-16 h-2" value={item.momentum_score * 100} max="100" />
                      <span className="text-xs tabular-nums">{(item.momentum_score * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="text-center text-sm tabular-nums">{item.days_since_first} {t('signals.early.daysUnit')}</td>
                  <td className="text-right text-sm tabular-nums">{item.sales_velocity}{t('signals.early.weekUnit')}</td>
                  <td className="text-right text-success text-sm font-medium">+{item.score_growth}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
