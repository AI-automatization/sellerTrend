import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';

export function DeadStockTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getDeadStock()
      .then((r) => setData(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  const riskColor = (level: string) =>
    level === 'high' ? 'badge-error' : level === 'medium' ? 'badge-warning' : 'badge-success';

  return (
    <SectionCard>
      <SectionHeader
        title="Dead Stock Bashorati"
        desc="Qaysi mahsulotlar tez orada sotilmaydigan holatga tushishi mumkin?"
      />
      {data.length === 0 ? (
        <EmptyState text="Dead stock xavfi yo'q — yaxshi!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((item: any) => (
            <div key={item.product_id} className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 hover:bg-base-300/60 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm truncate max-w-[65%]">{item.title}</h3>
                <span className={`badge ${riskColor(item.risk_level)} badge-sm`}>{item.risk_level}</span>
              </div>
              <div className="flex gap-4 text-xs text-base-content/60 mb-3">
                <span>Risk: <b>{(item.risk_score * 100).toFixed(0)}%</b></span>
                <span>~<b>{item.days_to_dead}</b> kun qoldi</span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-1.5 mb-2">
                <div
                  className={`h-1.5 rounded-full ${item.risk_level === 'high' ? 'bg-error' : item.risk_level === 'medium' ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${Math.min(item.risk_score * 100, 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {item.factors.map((f: string, i: number) => (
                  <span key={i} className="badge badge-xs badge-outline">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
