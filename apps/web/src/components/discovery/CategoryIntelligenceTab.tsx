import { useState, useEffect } from 'react';
import { categoryIntelligenceApi } from '../../api/client';

type TrendType = 'growing' | 'saturating' | 'declining' | 'emerging';

interface CategoryItem {
  category_id: string;
  product_count: number;
  avg_score: number;
  avg_weekly_sold: number;
  weekly_sold_change_pct: number | null;
  trend: TrendType;
}

const TREND_CONFIG: Record<TrendType, { label: string; badge: string; icon: string }> = {
  growing:    { label: "O'sishda", badge: 'badge-success',  icon: '📈' },
  saturating: { label: 'Barqaror', badge: 'badge-warning',  icon: '➡️' },
  declining:  { label: 'Tushishda', badge: 'badge-error',   icon: '📉' },
  emerging:   { label: 'Yangi',    badge: 'badge-info',     icon: '✨' },
};

export function CategoryIntelligenceTab() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TrendType | 'all'>('all');

  useEffect(() => {
    setLoading(true);
    categoryIntelligenceApi.getIntelligence(100)
      .then((res) => { setItems(res.data.categories ?? []); })
      .catch(() => setError("Ma'lumot yuklanmadi"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? items : items.filter((i) => i.trend === filter);

  const counts = {
    growing: items.filter((i) => i.trend === 'growing').length,
    saturating: items.filter((i) => i.trend === 'saturating').length,
    declining: items.filter((i) => i.trend === 'declining').length,
    emerging: items.filter((i) => i.trend === 'emerging').length,
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  if (error) return (
    <div role="alert" className="alert alert-error">
      <span>{error}</span>
    </div>
  );

  if (items.length === 0) return (
    <div className="text-center py-12 text-base-content/40">
      <p className="text-lg">Kategoriya ma'lumotlari yo'q</p>
      <p className="text-sm mt-1">Category aggregation worker ishlagandan so'ng ko'rinadi</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['growing', 'emerging', 'saturating', 'declining'] as TrendType[]).map((t) => {
          const cfg = TREND_CONFIG[t];
          return (
            <button
              key={t}
              onClick={() => setFilter(filter === t ? 'all' : t)}
              className={`rounded-xl p-3 text-left border transition-all ${
                filter === t
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300/40 bg-base-200/60 hover:border-primary/40'
              }`}
            >
              <div className="text-xl mb-1">{cfg.icon}</div>
              <div className="font-bold text-xl">{counts[t]}</div>
              <div className="text-xs text-base-content/50">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead className="bg-base-300/40">
              <tr>
                <th className="text-xs">Kategoriya ID</th>
                <th className="text-xs">Mahsulotlar</th>
                <th className="text-xs">Avg score</th>
                <th className="text-xs">Haftalik sotuv</th>
                <th className="text-xs">O'zgarish</th>
                <th className="text-xs">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const cfg = TREND_CONFIG[item.trend];
                const changePct = item.weekly_sold_change_pct;
                return (
                  <tr key={item.category_id} className="hover:bg-base-300/20">
                    <td className="font-mono text-xs text-base-content/60">#{item.category_id}</td>
                    <td className="text-sm">{item.product_count.toLocaleString()}</td>
                    <td className="text-sm tabular-nums">{item.avg_score.toFixed(2)}</td>
                    <td className="text-sm tabular-nums font-medium">{item.avg_weekly_sold.toLocaleString()}</td>
                    <td className="text-sm tabular-nums">
                      {changePct !== null ? (
                        <span className={changePct > 0 ? 'text-success' : changePct < 0 ? 'text-error' : 'text-base-content/40'}>
                          {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-base-content/30">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-sm ${cfg.badge}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-base-content/30 text-right">
        {filtered.length} ta kategoriya · So'nggi 14 kun dinamikasi
      </p>
    </div>
  );
}
