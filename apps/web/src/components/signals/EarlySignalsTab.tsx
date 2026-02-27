import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { EarlySignalItem } from './types';

export function EarlySignalsTab() {
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
        title="Yangi Mahsulot Erta Signallari"
        desc="30 kundan kam yoslidagi tez o'sayotgan mahsulotlar"
      />
      {data.length === 0 ? (
        <EmptyState text="Erta signallar yo'q" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>Mahsulot</th>
                <th className="text-center">Momentum</th>
                <th className="text-center">Yoshi</th>
                <th className="text-right">Sotuv tezligi</th>
                <th className="text-right">Score o'sishi</th>
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
                  <td className="text-center text-sm tabular-nums">{item.days_since_first} kun</td>
                  <td className="text-right text-sm tabular-nums">{item.sales_velocity}/hafta</td>
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
