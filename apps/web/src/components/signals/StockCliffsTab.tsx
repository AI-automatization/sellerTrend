import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { useI18n } from '../../i18n/I18nContext';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { StockCliffItem } from './types';

export function StockCliffsTab() {
  const { t } = useI18n();
  const [data, setData] = useState<StockCliffItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getStockCliffs()
      .then((r) => setData(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  const sevColor = (s: string) => s === 'critical' ? 'badge-error' : 'badge-warning';

  return (
    <SectionCard>
      <SectionHeader
        title={t('signals.stock.title')}
        desc={t('signals.stock.desc')}
      />
      {data.length === 0 ? (
        <EmptyState text={t('signals.stock.empty')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((item) => (
            <div key={item.product_id} className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 hover:bg-base-300/60 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm truncate max-w-[70%]">{item.title}</h3>
                <span className={`badge ${sevColor(item.severity)} badge-sm`}>{item.severity}</span>
              </div>
              <div className="flex gap-4 text-xs text-base-content/60">
                <span>{t('signals.stock.velocity')} <b>{item.current_velocity}</b>/kun</span>
                <span>{t('signals.stock.daysLeft').replace('{n}', String(item.estimated_days_left)).replace('~', '~')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
