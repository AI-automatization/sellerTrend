import { useState, useEffect } from 'react';
import { productsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';

interface TrackedProduct {
  product_id: string;
  title: string;
  score: number;
  weekly_bought: number | null;
  sell_price: number | null;
  trend?: string;
}

/**
 * Feature 32 — Telegram Mini App dashboard.
 * Lightweight view optimized for Telegram WebApp viewport.
 * Accessible via /tg-app route (no sidebar, compact layout).
 */
export function TelegramMiniAppPage() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Telegram WebApp SDK — theme sync
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }

    productsApi.getTracked()
      .then((r) => setProducts(Array.isArray(r.data) ? r.data : []))
      .catch((err: unknown) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function scoreColor(s: number) {
    if (s >= 6) return 'text-success';
    if (s >= 4) return 'text-warning';
    return 'text-base-content/50';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-ring loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
        <div className="text-center space-y-3">
          <p className="text-3xl">⚠️</p>
          <p className="text-sm text-base-content/60">{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary btn-sm">Qayta urinish</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-3 pb-20">
      {/* Compact header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-content font-bold text-xs">V</span>
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">VENTRA</p>
          <p className="text-xs text-base-content/40">{products.length} mahsulot</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-base-200/60 rounded-xl p-2.5 text-center">
          <p className="text-xs text-base-content/50">Jami</p>
          <p className="font-bold text-lg tabular-nums">{products.length}</p>
        </div>
        <div className="bg-base-200/60 rounded-xl p-2.5 text-center">
          <p className="text-xs text-base-content/50">O'rtacha</p>
          <p className="font-bold text-lg tabular-nums text-primary">
            {products.length > 0
              ? (products.reduce((s, p) => s + (p.score ?? 0), 0) / products.length).toFixed(1)
              : '—'}
          </p>
        </div>
        <div className="bg-base-200/60 rounded-xl p-2.5 text-center">
          <p className="text-xs text-base-content/50">Sotuv</p>
          <p className="font-bold text-lg tabular-nums text-success">
            {products.reduce((s, p) => s + (p.weekly_bought ?? 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Product list */}
      {products.length === 0 ? (
        <div className="text-center py-12 text-base-content/30">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">Kuzatilayotgan mahsulotlar yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.product_id} className="bg-base-200/60 rounded-xl p-3 flex items-center gap-3">
              <div className={`text-lg font-bold tabular-nums w-10 text-center ${scoreColor(p.score)}`}>
                {p.score?.toFixed(1) ?? '—'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <div className="flex gap-3 text-xs text-base-content/40 mt-0.5">
                  {p.weekly_bought != null && <span>{p.weekly_bought} ta/hft</span>}
                  {p.sell_price != null && <span>{Number(p.sell_price).toLocaleString()} so'm</span>}
                </div>
              </div>
              <span className="text-xs text-base-content/30">#{p.product_id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
