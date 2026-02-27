import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { CannibalizationPair } from './types';

export function CannibalizationTab() {
  const [data, setData] = useState<CannibalizationPair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getCannibalization()
      .then((r) => setData(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title="Kannibalizatsiya Ogohlantirishi"
        desc="Sizning mahsulotlaringiz bir-birining bozorini yeyaptimi?"
      />
      {data.length === 0 ? (
        <EmptyState text="Kannibalizatsiya aniqlanmadi — yaxshi!" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>Mahsulot A</th>
                <th>Mahsulot B</th>
                <th className="text-center">Overlap</th>
                <th>Sabab</th>
              </tr>
            </thead>
            <tbody>
              {data.map((pair, i) => (
                <tr key={i} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[200px] truncate text-sm">{pair.product_a_title}</td>
                  <td className="max-w-[200px] truncate text-sm">{pair.product_b_title}</td>
                  <td className="text-center">
                    <div className="radial-progress text-xs text-warning" style={{ '--value': pair.overlap_score * 100, '--size': '2.5rem' } as React.CSSProperties}>
                      {(pair.overlap_score * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="text-xs text-base-content/60 max-w-[200px]">{pair.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
