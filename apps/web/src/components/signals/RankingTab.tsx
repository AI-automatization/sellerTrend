import { useState } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { RankingEntry } from './types';

export function RankingTab() {
  const [productId, setProductId] = useState('');
  const [data, setData] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function handleSearch() {
    if (!productId.trim()) return;
    setLoading(true);
    setSearched(true);
    signalsApi.getRanking(productId.trim())
      .then((r) => setData(r.data))
      .catch((e) => { logError(e); setData([]); })
      .finally(() => setLoading(false));
  }

  return (
    <SectionCard>
      <SectionHeader
        title="Ranking Position Tracker"
        desc="Mahsulotning kategoriya ichidagi pozitsiyasi tarixi"
      />
      <div className="flex gap-2 mb-6 flex-wrap">
        <input
          type="text"
          className="input input-bordered input-sm w-48"
          placeholder="Product ID"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Ko\'rish'}
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : searched && data.length === 0 ? (
        <EmptyState text="Bu mahsulot uchun ranking tarixi topilmadi" />
      ) : data.length > 0 ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
              <p className="text-xs text-base-content/40">Hozirgi rank</p>
              <p className="text-2xl font-bold mt-1">#{data[data.length - 1].rank}</p>
            </div>
            <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
              <p className="text-xs text-base-content/40">Eng yaxshi</p>
              <p className="text-2xl font-bold mt-1 text-success">#{Math.min(...data.map((d) => d.rank))}</p>
            </div>
            <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
              <p className="text-xs text-base-content/40">O'rt. Score</p>
              <p className="text-2xl font-bold mt-1">
                {(data.reduce((s, d) => s + (d.score ?? 0), 0) / data.length).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
              <p className="text-xs text-base-content/40">Ma'lumotlar</p>
              <p className="text-2xl font-bold mt-1">{data.length} kun</p>
            </div>
          </div>

          {/* History table */}
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-xs text-base-content/40 uppercase">
                  <th>Sana</th>
                  <th className="text-center">Rank</th>
                  <th className="text-right">Score</th>
                  <th className="text-right">Haftalik sotuv</th>
                  <th>Kategoriya</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((item, i) => {
                  const prevRank = i < data.length - 1 ? [...data].reverse()[i + 1]?.rank : null;
                  const rankChange = prevRank ? prevRank - item.rank : 0;
                  return (
                    <tr key={i} className="hover:bg-base-300/20 transition-colors">
                      <td className="text-sm text-base-content/70">
                        {new Date(item.date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="text-center">
                        <span className="font-bold text-sm">#{item.rank}</span>
                        {rankChange !== 0 && (
                          <span className={`text-xs ml-1 ${rankChange > 0 ? 'text-success' : 'text-error'}`}>
                            {rankChange > 0 ? `+${rankChange}` : rankChange}
                          </span>
                        )}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {item.score != null ? item.score.toFixed(2) : '\u2014'}
                      </td>
                      <td className="text-right tabular-nums text-sm text-success">
                        {item.weekly_bought ?? '\u2014'}
                      </td>
                      <td className="text-xs text-base-content/50">#{item.category_id}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <EmptyState text="Product ID kiritib, ranking tarixini ko'ring" />
      )}
    </SectionCard>
  );
}
