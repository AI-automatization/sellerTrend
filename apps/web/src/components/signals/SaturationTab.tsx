import { useState } from 'react';
import { signalsApi } from '../../api/client';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';

export function SaturationTab() {
  const [categoryId, setCategoryId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  function handleSearch() {
    if (!categoryId) return;
    setLoading(true);
    signalsApi.getSaturation(Number(categoryId))
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  const levelColor = (l: string) =>
    l === 'oversaturated' ? 'text-error' : l === 'saturated' ? 'text-warning' :
    l === 'moderate' ? 'text-info' : 'text-success';

  return (
    <SectionCard>
      <SectionHeader
        title="Kategoriya Saturatsiya Indeksi"
        desc="Kategoriyada raqobat qanchalik kuchli?"
      />
      <div className="flex gap-2 mb-6 flex-wrap">
        <input
          type="number"
          className="input input-bordered input-sm w-48"
          placeholder="Kategoriya ID"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Tahlil'}
        </button>
      </div>
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
            <p className="text-xs text-base-content/40">Saturatsiya</p>
            <p className="text-2xl font-bold mt-1">{(data.saturation_index * 100).toFixed(0)}%</p>
            <p className={`text-xs mt-0.5 font-medium ${levelColor(data.level)}`}>{data.level}</p>
          </div>
          <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
            <p className="text-xs text-base-content/40">Sotuvchilar</p>
            <p className="text-2xl font-bold mt-1">{data.seller_count}</p>
          </div>
          <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
            <p className="text-xs text-base-content/40">O'rt. Score</p>
            <p className="text-2xl font-bold mt-1">{data.avg_score}</p>
          </div>
          <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
            <p className="text-xs text-base-content/40">Top 10% ulushi</p>
            <p className="text-2xl font-bold mt-1">{data.top10_share_pct}%</p>
          </div>
        </div>
      )}
      {!data && !loading && (
        <EmptyState text="Kategoriya ID kiritib, tahlil qiling" />
      )}
    </SectionCard>
  );
}
