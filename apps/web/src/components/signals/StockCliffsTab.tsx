import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';

export function StockCliffsTab() {
  const [data, setData] = useState<any[]>([]);
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
        title="Stock Cliff Alert"
        desc="Zaxira tugashiga yaqin mahsulotlar"
      />
      {data.length === 0 ? (
        <EmptyState text="Stock cliff xavfi yo'q" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((item: any) => (
            <div key={item.product_id} className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 hover:bg-base-300/60 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm truncate max-w-[70%]">{item.title}</h3>
                <span className={`badge ${sevColor(item.severity)} badge-sm`}>{item.severity}</span>
              </div>
              <div className="flex gap-4 text-xs text-base-content/60">
                <span>Tezlik: <b>{item.current_velocity}</b>/kun</span>
                <span>~<b className={item.estimated_days_left <= 7 ? 'text-error' : ''}>{item.estimated_days_left}</b> kun qoldi</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
