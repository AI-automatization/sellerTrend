import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { watchlistApi } from '../api/client';

interface SharedProduct {
  product_id: string;
  title: string;
  score: number | null;
  weekly_bought: number | null;
  sell_price: number | null;
}

interface WatchlistData {
  name: string;
  owner_email?: string;
  products: SharedProduct[];
  views: number;
}

export function SharedWatchlistPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<WatchlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    watchlistApi.getShared(token)
      .then((r) => setData(r.data))
      .catch(() => setError("Watchlist topilmadi yoki muddati o'tgan"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-ring loading-lg text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="text-center space-y-4">
          <p className="text-4xl">🔗</p>
          <p className="text-base-content/50">{error || 'Xato yuz berdi'}</p>
          <Link to="/login" className="btn btn-primary btn-sm">Platformaga kirish</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center">
                <span className="text-primary-content font-bold text-sm">V</span>
              </div>
              <span className="font-bold text-sm text-base-content/50">VENTRA</span>
            </div>
            <h1 className="text-2xl font-bold">{data.name}</h1>
            <p className="text-sm text-base-content/50 mt-1">
              {data.products.length} mahsulot &middot; {data.views} ko'rish
            </p>
          </div>
          <Link to="/login" className="btn btn-primary btn-sm">Platformaga kirish</Link>
        </div>

        {/* Products table */}
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden">
          {data.products.length === 0 ? (
            <div className="text-center py-12 text-base-content/30">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-sm">Bu ro'yxatda mahsulotlar yo'q</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-xs text-base-content/40 uppercase">
                    <th>Mahsulot</th>
                    <th className="text-right">Score</th>
                    <th className="text-right">Haftalik sotuv</th>
                    <th className="text-right">Narx</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p) => (
                    <tr key={p.product_id} className="hover:bg-base-300/20 transition-colors">
                      <td>
                        <div className="font-medium text-sm max-w-xs truncate">{p.title}</div>
                        <div className="text-xs text-base-content/30">#{p.product_id}</div>
                      </td>
                      <td className="text-right">
                        {p.score != null ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold tabular-nums border ${
                            p.score >= 6 ? 'bg-success/15 text-success border-success/20'
                              : p.score >= 4 ? 'bg-warning/15 text-warning border-warning/20'
                                : 'bg-base-300 text-base-content/50 border-base-300'
                          }`}>{p.score.toFixed(2)}</span>
                        ) : <span className="text-base-content/20">—</span>}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {p.weekly_bought != null ? p.weekly_bought.toLocaleString() : '—'}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {p.sell_price ? `${Number(p.sell_price).toLocaleString()} so'm` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-base-content/30">
          VENTRA Analytics Platform — uzum.uz marketplace tahlili
        </p>
      </div>
    </div>
  );
}
