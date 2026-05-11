import { useState } from 'react';
import { wbCompareApi } from '../api/products';
import type { WbCompareItem } from '../api/types';
import { getErrorMessage } from '../utils/getErrorMessage';

interface Props {
  productId: string;
  productPrice: number | null; // UZS
}

const PAGE_SIZE = 12;

export function WbCompareSection({ productId, productPrice }: Props) {
  const [items, setItems] = useState<WbCompareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [cached, setCached] = useState(false);
  const [page, setPage] = useState(1);
  const [onlyCheaper, setOnlyCheaper] = useState(true);

  async function handleLoad() {
    setLoading(true);
    setError('');
    try {
      const res = await wbCompareApi.compare(productId);
      setItems(res.data.results);
      setCached(res.data.cached);
      setLoaded(true);
      setPage(1);
      setOnlyCheaper(true);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, '');
      setError(msg && msg !== 'Internal server error'
        ? msg
        : 'Wildberries dan ma\'lumot olib bo\'lmadi. Keyinroq qayta urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
          <span className="text-xl">🫐</span>
          Wildberries UZ
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {cached && (
            <span className="badge badge-ghost badge-sm text-base-content/40">cache</span>
          )}
          {loaded && productPrice != null && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-success"
                checked={onlyCheaper}
                onChange={(e) => { setOnlyCheaper(e.target.checked); setPage(1); }}
              />
              <span className="text-xs text-base-content/60">Faqat arzonroqlari</span>
            </label>
          )}
          {!loaded ? (
            <button
              onClick={handleLoad}
              disabled={loading}
              className="btn btn-sm btn-outline"
            >
              {loading ? (
                <><span className="loading loading-spinner loading-xs" /> Qidirilmoqda...</>
              ) : (
                'O\'xshash mahsulotlarni ko\'rish'
              )}
            </button>
          ) : (
            <span className="text-xs text-base-content/40">{items.length} ta natija</span>
          )}
        </div>
      </div>

      {/* Description */}
      {!loaded && !loading && (
        <p className="text-sm text-base-content/50">
          Bu mahsulotning rasmi orqali Wildberries UZ dan o'xshash mahsulotlarni topadi. Narx va yetkazib beruvchi ma'lumotlari ko'rsatiladi.
        </p>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="alert alert-error alert-soft text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-56 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {loaded && !loading && items.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <p className="text-3xl">🔍</p>
          <p className="text-sm font-medium text-base-content/60">Bu mahsulot Wildberries da topilmadi</p>
          <p className="text-xs text-base-content/40">Ehtimol bu mahsulot WB da yo'q yoki rasm orqali aniqlab bo'lmadi</p>
        </div>
      )}

      {/* Cards */}
      {loaded && !loading && items.length > 0 && (() => {
        const filtered = (onlyCheaper && productPrice != null)
          ? items.filter((item) => item.priceUzs > 0 && item.priceUzs < productPrice)
          : items;
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        return (
          <>
            {filtered.length === 0 && (
              <div className="text-center py-6 text-base-content/40 text-sm">
                Uzum narxidan arzon mahsulot topilmadi
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {pageItems.map((item) => {
                const isCheaper = productPrice != null && item.priceUzs > 0 && item.priceUzs < productPrice;
                const saving = isCheaper && productPrice != null
                  ? Math.round(productPrice - item.priceUzs)
                  : null;
                const hasDiscount = item.originalPriceUzs > item.priceUzs;

                return (
                  <a
                    key={item.productId}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex flex-col rounded-xl border transition-all overflow-hidden ${
                      isCheaper
                        ? 'bg-success/5 border-success/30 hover:border-success/60'
                        : 'bg-base-300/60 border-base-300/40 hover:border-primary/40 hover:bg-base-300/80'
                    }`}
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-base-300/40 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.removeAttribute('style');
                        }}
                      />
                      <div className="w-full h-full items-center justify-center text-base-content/20 text-2xl hidden" style={{}}>
                        📦
                      </div>
                      {/* Platform badge */}
                      <span className="absolute top-2 left-2 bg-purple-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        WB
                      </span>
                      {/* Saving badge */}
                      {saving != null && (
                        <span className="absolute top-2 right-2 bg-success/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          −{saving.toLocaleString('ru-RU')}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col gap-1.5 p-3 flex-1">
                      {/* Title */}
                      <p className="text-xs text-base-content/80 leading-snug line-clamp-2 font-medium">
                        {item.title}
                      </p>

                      {/* Price */}
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-success tabular-nums">
                          {item.priceUzs > 0 ? `${item.priceUzs.toLocaleString('ru-RU')} so'm` : '—'}
                        </p>
                        {hasDiscount && (
                          <p className="text-[11px] line-through text-base-content/30 tabular-nums">
                            {item.originalPriceUzs.toLocaleString('ru-RU')}
                          </p>
                        )}
                      </div>

                      {/* Brand */}
                      {item.brand && (
                        <p className="text-[10px] text-base-content/50 truncate">
                          {item.brand}
                        </p>
                      )}

                      {/* Supplier */}
                      {item.supplier && (
                        <p className="text-[10px] text-base-content/40 truncate mt-auto">
                          🏭 {item.supplier}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {item.rating > 0 && (
                          <span className="text-[10px] text-yellow-400 flex items-center gap-0.5">
                            ★ {item.rating.toFixed(1)}
                          </span>
                        )}
                        {item.feedbacks > 0 && (
                          <span className="text-[10px] text-base-content/40">
                            {item.feedbacks.toLocaleString('ru-RU')} sharh
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="btn btn-sm btn-ghost btn-square"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`btn btn-sm btn-square ${p === page ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="btn btn-sm btn-ghost btn-square"
                >
                  ›
                </button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
