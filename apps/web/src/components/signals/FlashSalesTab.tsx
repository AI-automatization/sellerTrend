import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { useI18n } from '../../i18n/I18nContext';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { FlashSaleItem } from './types';

export function FlashSalesTab() {
  const { t } = useI18n();
  const [data, setData] = useState<FlashSaleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getFlashSales()
      .then((r) => setData(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title={t('signals.flash.title')}
        desc={t('signals.flash.desc')}
      />
      {data.length === 0 ? (
        <EmptyState text={t('signals.flash.empty')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>{t('signals.flash.col.product')}</th>
                <th className="text-right">{t('signals.flash.col.oldPrice')}</th>
                <th className="text-right">{t('signals.flash.col.newPrice')}</th>
                <th className="text-center">{t('signals.flash.col.drop')}</th>
                <th>{t('signals.flash.col.date')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[200px] truncate text-sm">{item.title}</td>
                  <td className="text-right tabular-nums text-sm line-through text-base-content/40">
                    {Number(item.old_price).toLocaleString()} {t('common.som')}
                  </td>
                  <td className="text-right tabular-nums text-sm text-success font-medium">
                    {Number(item.new_price).toLocaleString()} {t('common.som')}
                  </td>
                  <td className="text-center">
                    <span className="badge badge-error badge-sm">-{item.price_drop_pct}%</span>
                  </td>
                  <td className="text-xs text-base-content/40">{new Date(item.detected_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
