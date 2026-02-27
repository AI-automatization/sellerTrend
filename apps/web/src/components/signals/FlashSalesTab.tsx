import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { FlashSaleItem } from './types';

export function FlashSalesTab() {
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
        title="Flash Sale Detector"
        desc="Kuzatilayotgan mahsulotlarda keskin narx tushishi"
      />
      {data.length === 0 ? (
        <EmptyState text="Flash sale aniqlanmadi" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>Mahsulot</th>
                <th className="text-right">Eski narx</th>
                <th className="text-right">Yangi narx</th>
                <th className="text-center">Tushish</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[200px] truncate text-sm">{item.title}</td>
                  <td className="text-right tabular-nums text-sm line-through text-base-content/40">
                    {Number(item.old_price).toLocaleString()} so'm
                  </td>
                  <td className="text-right tabular-nums text-sm text-success font-medium">
                    {Number(item.new_price).toLocaleString()} so'm
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
