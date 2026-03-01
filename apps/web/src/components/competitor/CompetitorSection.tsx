import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { competitorApi } from '../../api/client';
import type { CompetitorProduct, DiscoveredCompetitor } from '../../api/competitor';
import { CompetitorPriceTable } from './CompetitorPriceTable';
import { PriceComparisonChart } from './PriceComparisonChart';

interface Props {
  productId: string;
  ourPrice: number | null;
  ourTitle: string;
}

export function CompetitorSection({ productId, ourPrice, ourTitle }: Props) {
  const [tracked, setTracked] = useState<CompetitorProduct[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredCompetitor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingTracked, setLoadingTracked] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTracked = useCallback(async () => {
    try {
      setLoadingTracked(true);
      const res = await competitorApi.getTracked(productId);
      setTracked(res.data);
    } catch {
      // silent — raqiblar bo'lmasligi mumkin
    } finally {
      setLoadingTracked(false);
    }
  }, [productId]);

  useEffect(() => {
    loadTracked();
  }, [loadTracked]);

  async function handleDiscover() {
    setShowDiscover(true);
    setLoadingDiscover(true);
    setError(null);
    try {
      const res = await competitorApi.discover(productId);
      setDiscovered(res.data);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string) ?? err.message
        : 'Raqiblarni qidirishda xatolik';
      setError(message);
    } finally {
      setLoadingDiscover(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleTrack() {
    if (selected.size === 0) return;
    setIsTracking(true);
    setError(null);
    try {
      await competitorApi.track(productId, Array.from(selected).map(Number));
      setShowDiscover(false);
      setSelected(new Set());
      setDiscovered([]);
      await loadTracked();
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string) ?? err.message
        : 'Kuzatishda xatolik';
      setError(message);
    } finally {
      setIsTracking(false);
    }
  }

  async function handleUntrack(competitorProductId: string) {
    try {
      await competitorApi.untrack(productId, competitorProductId);
      setTracked((prev) => prev.filter((c) => c.competitor_product_id !== competitorProductId));
    } catch {
      // silent
    }
  }

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="card-title text-base gap-2">
              🏪 Raqiblar narxi
            </h2>
            <p className="text-xs text-base-content/50 mt-0.5">
              {tracked.length > 0
                ? `${tracked.length} ta raqib kuzatilmoqda`
                : 'Bir kategoriyadan raqiblar narxini kuzating'}
            </p>
          </div>
          <button
            onClick={handleDiscover}
            disabled={loadingDiscover}
            className="btn btn-outline btn-sm gap-2"
          >
            {loadingDiscover
              ? <span className="loading loading-spinner loading-xs" />
              : '🔍'}
            Raqiblarni qidirish
          </button>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="alert alert-error alert-soft py-2 text-sm">
            <span>{error}</span>
          </div>
        )}

        {/* Tracked: loading skeleton */}
        {loadingTracked && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-10 w-full rounded" />
            ))}
          </div>
        )}

        {/* Tracked: chart + table */}
        {!loadingTracked && tracked.length > 0 && (
          <>
            <PriceComparisonChart
              ourProduct={{ title: ourTitle, sell_price: ourPrice ? String(ourPrice) : null }}
              competitors={tracked}
            />
            <CompetitorPriceTable
              competitors={tracked}
              ourPrice={ourPrice}
              onUntrack={handleUntrack}
            />
          </>
        )}

        {/* Empty state */}
        {!loadingTracked && tracked.length === 0 && !showDiscover && (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🏪</p>
            <p className="text-sm text-base-content/50">Raqib qo'shilmagan</p>
            <p className="text-xs text-base-content/30 mt-1">
              "Raqiblarni qidirish" tugmasini bosing
            </p>
          </div>
        )}

        {/* Discover results */}
        {showDiscover && (
          <div className="border-t border-base-300 pt-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-sm">
                Kategoriyadan topilgan raqiblar
                {discovered.length > 0 && (
                  <span className="badge badge-neutral badge-sm ml-2">{discovered.length}</span>
                )}
              </h3>
              <div className="flex gap-2">
                {selected.size > 0 && (
                  <button
                    onClick={handleTrack}
                    disabled={isTracking}
                    className="btn btn-primary btn-sm gap-2"
                  >
                    {isTracking && <span className="loading loading-spinner loading-xs" />}
                    {selected.size} ta ni kuzatish
                  </button>
                )}
                <button
                  onClick={() => { setShowDiscover(false); setDiscovered([]); setSelected(new Set()); }}
                  className="btn btn-ghost btn-sm"
                >
                  Yopish
                </button>
              </div>
            </div>

            {/* Discover: loading */}
            {loadingDiscover && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton h-12 w-full rounded" />
                ))}
              </div>
            )}

            {/* Discover: table */}
            {!loadingDiscover && discovered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th className="w-8"></th>
                      <th>Mahsulot</th>
                      <th className="text-right">Narx</th>
                      <th className="text-right">Farq</th>
                      <th className="text-right">Buyurtmalar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discovered.map((c) => {
                      const pid = String(c.product_id);
                      const isCheaper = ourPrice !== null && c.sell_price < ourPrice;
                      const diffPct = ourPrice ? ((c.sell_price - ourPrice) / ourPrice) * 100 : null;
                      return (
                        <tr
                          key={pid}
                          className={`hover cursor-pointer ${isCheaper ? 'bg-error/5' : 'bg-success/5'}`}
                          onClick={() => toggleSelect(pid)}
                        >
                          <td>
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm checkbox-primary"
                              checked={selected.has(pid)}
                              onChange={() => toggleSelect(pid)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`${c.title} ni tanlash`}
                            />
                          </td>
                          <td>
                            <p className="font-medium text-sm truncate max-w-xs">{c.title}</p>
                            <p className="text-xs text-base-content/30">#{c.product_id}</p>
                          </td>
                          <td className="text-right tabular-nums text-sm">
                            {c.sell_price ? (
                              <span className={`font-medium ${isCheaper ? 'text-error' : 'text-success'}`}>
                                {c.sell_price.toLocaleString()} so'm
                              </span>
                            ) : '---'}
                          </td>
                          <td className="text-right tabular-nums text-xs">
                            {diffPct !== null ? (
                              <span className={isCheaper ? 'text-error' : 'text-success'}>
                                {isCheaper ? '↓' : '↑'} {Math.abs(diffPct).toFixed(1)}%
                              </span>
                            ) : '---'}
                          </td>
                          <td className="text-right text-sm text-base-content/50">
                            {c.orders_amount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loadingDiscover && discovered.length === 0 && (
              <p className="text-sm text-base-content/40 text-center py-4">
                Kategoriyada boshqa mahsulot topilmadi
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
