import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { useI18n } from '../../i18n/I18nContext';
import { SectionCard } from './SectionCard';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { ReplenishmentItem } from './types';

export function ReplenishmentTab() {
  const { t } = useI18n();
  const [data, setData] = useState<ReplenishmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadTime, setLeadTime] = useState(14);

  useEffect(() => {
    setLoading(true);
    signalsApi.getReplenishment(leadTime)
      .then((r) => setData(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, [leadTime]);

  return (
    <SectionCard>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg lg:text-xl font-bold">{t('signals.replen.title')}</h2>
          <p className="text-base-content/50 text-sm">{t('signals.replen.desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/50">{t('signals.replen.deliveryLabel')}</span>
          <select
            className="select select-bordered select-sm"
            value={leadTime}
            onChange={(e) => setLeadTime(Number(e.target.value))}
          >
            <option value={7}>{t('signals.replen.7days')}</option>
            <option value={14}>{t('signals.replen.14days')}</option>
            <option value={21}>{t('signals.replen.21days')}</option>
            <option value={30}>{t('signals.replen.30days')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState text={t('signals.replen.empty')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>{t('signals.replen.col.product')}</th>
                <th className="text-right">{t('signals.replen.col.dailySales')}</th>
                <th className="text-right">{t('signals.replen.col.reorderPoint')}</th>
                <th className="text-right">{t('signals.replen.col.advice')}</th>
                <th>{t('signals.replen.col.nextOrder')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const isUrgent = new Date(item.next_order_date) <= new Date(Date.now() + 7 * 86400000);
                return (
                  <tr key={item.product_id} className={`hover:bg-base-300/20 transition-colors ${isUrgent ? 'bg-error/5' : ''}`}>
                    <td className="max-w-[200px] truncate text-sm">{item.title}</td>
                    <td className="text-right tabular-nums text-sm">{item.avg_daily_sales}</td>
                    <td className="text-right tabular-nums text-sm">{item.reorder_point} {t('signals.replen.unit')}</td>
                    <td className="text-right font-semibold tabular-nums text-sm">{item.suggested_order_qty} {t('signals.replen.unit')}</td>
                    <td>
                      <span className={`text-sm ${isUrgent ? 'text-error font-bold' : 'text-base-content/70'}`}>
                        {item.next_order_date}
                        {isUrgent && <span className="ml-1 badge badge-error badge-xs">{t('signals.replen.urgent')}</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
