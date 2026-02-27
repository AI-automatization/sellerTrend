import { useState, useEffect } from 'react';
import { competitorApi } from '../api/client';
import type { CompetitorProduct, DiscoveredCompetitor, CompetitorPricePoint } from '../api/competitor';
import { getErrorMessage } from '../utils/getErrorMessage';
import { logError, toastError } from '../utils/handleError';
import { glassTooltip } from '../utils/formatters';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  productId: string;
  productPrice: number | null;
}

export function CompetitorSection({ productId, productPrice }: Props) {
  const [tracked, setTracked] = useState<CompetitorProduct[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredCompetitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [trackingIds, setTrackingIds] = useState<Set<number>>(new Set());
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<CompetitorPricePoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    competitorApi.getTracked(productId)
      .then((r) => setTracked(Array.isArray(r.data) ? r.data : []))
      .catch(logError)
      .finally(() => setLoading(false));
  }, [productId]);

  function handleDiscover() {
    setDiscovering(true);
    setError('');
    competitorApi.discover(productId)
      .then((r) => setDiscovered(Array.isArray(r.data) ? r.data : []))
      .catch((err: unknown) => setError(getErrorMessage(err, 'Raqiblarni topib bo\'lmadi')))
      .finally(() => setDiscovering(false));
  }

  function handleTrack(compId: number) {
    setTrackingIds((s) => new Set(s).add(compId));
    competitorApi.track(productId, [compId])
      .then(() => {
        competitorApi.getTracked(productId).then((r) => setTracked(Array.isArray(r.data) ? r.data : []));
        setDiscovered((prev) => prev.filter((d) => d.product_id !== compId));
      })
      .catch((e) => toastError(e))
      .finally(() => setTrackingIds((s) => { const n = new Set(s); n.delete(compId); return n; }));
  }

  function handleUntrack(compProdId: string) {
    competitorApi.untrack(productId, compProdId)
      .then(() => setTracked((prev) => prev.filter((t) => t.competitor_product_id !== compProdId)))
      .catch((e) => toastError(e));
  }

  function loadHistory(compProdId: string) {
    if (historyId === compProdId) { setHistoryId(null); return; }
    setHistoryId(compProdId);
    setHistoryLoading(true);
    competitorApi.getHistory(productId, compProdId)
      .then((r) => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }

  function trendIcon(trend: string) {
    if (trend === 'up') return <span className="text-error text-xs font-bold">↑</span>;
    if (trend === 'down') return <span className="text-success text-xs font-bold">↓</span>;
    return <span className="text-base-content/30 text-xs">→</span>;
  }

  function priceDiff(price: number | null) {
    if (!price || !productPrice || productPrice <= 0) return null;
    const diff = ((price - productPrice) / productPrice) * 100;
    if (Math.abs(diff) < 1) return null;
    return diff;
  }

  return (
    <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            Raqiblar Narx Kuzatuvi
          </h2>
          <p className="text-xs text-base-content/50 mt-0.5">
            Shu kategoriya do'konlarining narxlarini kuzating
          </p>
        </div>
        <button onClick={handleDiscover} disabled={discovering} className="btn btn-sm btn-outline gap-1">
          {discovering ? <span className="loading loading-spinner loading-xs" /> : '🔍'}
          Raqiblarni topish
        </button>
      </div>

      {error && <div className="alert alert-error alert-sm text-sm">{error}</div>}

      {/* Tracked competitors */}
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-dots loading-lg text-primary" />
        </div>
      ) : tracked.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-base-content/50 font-medium">Kuzatilayotgan raqiblar ({tracked.length})</p>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-xs text-base-content/40 uppercase">
                  <th>Raqib mahsulot</th>
                  <th>Do'kon</th>
                  <th className="text-right">Narx</th>
                  <th className="text-right">Farq</th>
                  <th className="text-center">Trend</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tracked.map((c) => {
                  const diff = priceDiff(c.latest_price);
                  return (
                    <tr key={c.id} className="hover:bg-base-300/20 transition-colors">
                      <td>
                        <p className="text-sm font-medium max-w-xs truncate">{c.title}</p>
                        <p className="text-xs text-base-content/30">#{c.competitor_product_id}</p>
                      </td>
                      <td className="text-sm text-base-content/60">{c.shop_name}</td>
                      <td className="text-right tabular-nums text-sm">
                        {c.latest_price ? `${c.latest_price.toLocaleString()} so'm` : '—'}
                        {c.previous_price && c.latest_price && c.previous_price !== c.latest_price && (
                          <p className="text-xs text-base-content/30 line-through">
                            {c.previous_price.toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="text-right text-xs tabular-nums">
                        {diff != null ? (
                          <span className={diff > 0 ? 'text-success' : 'text-error'}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-center">{trendIcon(c.price_trend)}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => loadHistory(c.competitor_product_id)}
                            className={`btn btn-xs ${historyId === c.competitor_product_id ? 'btn-primary' : 'btn-ghost'}`}>
                            📊
                          </button>
                          <button onClick={() => handleUntrack(c.competitor_product_id)}
                            className="btn btn-xs btn-ghost text-error">✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Price history chart */}
          {historyId && (
            <div className="rounded-xl bg-base-300/60 border border-base-300/40 p-4">
              <p className="text-xs text-base-content/50 mb-2">Narx tarixi — #{historyId}</p>
              {historyLoading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-spinner loading-sm text-primary" />
                </div>
              ) : history.length > 1 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={history.map((h) => ({
                      date: new Date(h.snapshot_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
                      price: h.sell_price,
                    }))}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                    <Tooltip {...glassTooltip} formatter={(v: number) => [`${v.toLocaleString()} so'm`, 'Narx']} />
                    <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-base-content/30 text-center py-4">Yetarli tarix yo'q</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-base-content/30">
          <p className="text-3xl mb-2">⚖️</p>
          <p className="text-sm">Raqiblar hali kuzatilmayapti</p>
          <p className="text-xs mt-1">"Raqiblarni topish" tugmasini bosing</p>
        </div>
      )}

      {/* Discovered competitors */}
      {discovered.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-base-content/50 font-medium">Topilgan raqiblar ({discovered.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {discovered.slice(0, 12).map((d) => {
              const diff = productPrice ? ((d.sell_price - productPrice) / productPrice * 100) : null;
              return (
                <div key={d.product_id} className="flex items-center gap-3 bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-base-content/40">{d.shop_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold tabular-nums">{d.sell_price.toLocaleString()} so'm</span>
                      {diff != null && Math.abs(diff) >= 1 && (
                        <span className={`text-xs ${diff < 0 ? 'text-success' : 'text-error'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleTrack(d.product_id)}
                    disabled={trackingIds.has(d.product_id)}
                    className="btn btn-xs btn-primary shrink-0"
                  >
                    {trackingIds.has(d.product_id) ? <span className="loading loading-spinner loading-xs" /> : '+ Kuzatish'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
