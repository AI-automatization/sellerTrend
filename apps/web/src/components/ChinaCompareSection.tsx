import { useState, useEffect } from 'react';
import { chinaCompareApi } from '../api/products';
import { toolsApi } from '../api/client';
import type { ChinaCompareItem } from '../api/types';
import { getErrorMessage } from '../utils/getErrorMessage';

interface ExchangeRates {
  usd: number;
  eur: number;
  date: string;
}

interface Props {
  productId: string;
  productPrice: number | null;
}

const PAGE_SIZE = 12;

// "UZS 7,779.39-8,377.80" → minimum raqamni qaytaradi (UZS)
function parseMinPrice(raw: string): number | null {
  if (!raw) return null;
  const numbersOnly = raw.replace(/^[A-Z$€¥£₩]+\s*/, '');
  const first = numbersOnly.split(/\s*[-–]\s*/)[0];
  const n = parseFloat(first.replace(/,/g, '').replace(/\s/g, ''));
  return isNaN(n) ? null : n;
}

function formatPrice(raw: string): string {
  if (!raw) return '—';
  // "UZS 7,779.39-8,377.80" → currency + range raqamlarni ajrat
  const currencyMatch = raw.match(/^([A-Z$€¥£₩]+)\s*/);
  const currency = currencyMatch ? currencyMatch[1] : '';
  const numbersOnly = raw.replace(/^[A-Z$€¥£₩]+\s*/, '');
  // range bo'lsa (masalan "7779.39-8377.80") → ikki raqam
  const parts = numbersOnly.split(/\s*[-–]\s*/);
  const fmt = (s: string) => {
    const n = parseFloat(s.replace(/,/g, ''));
    if (isNaN(n)) return s;
    return n % 1 === 0 ? n.toLocaleString('ru-RU') : n.toFixed(2);
  };
  const formatted = parts.map(fmt).join(' – ');
  return currency ? `${currency} ${formatted}` : formatted;
}

export function ChinaCompareSection({ productId, productPrice }: Props) {
  const [items, setItems] = useState<ChinaCompareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [cached, setCached] = useState(false);
  const [page, setPage] = useState(1);
  const [onlyCheaper, setOnlyCheaper] = useState(true);
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    toolsApi.getExchangeRates().then((res) => setRates(res.data)).catch(() => null);
  }, []);

  async function handleLoad() {
    setLoading(true);
    setError('');
    try {
      const res = await chinaCompareApi.compare(productId);
      setItems(res.data.results);
      setCached(res.data.cached);
      setLoaded(true);
      setPage(1);
      setOnlyCheaper(true);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, '');
      setError(msg && msg !== 'Internal server error'
        ? msg
        : 'Alibaba dan ma\'lumot olib bo\'lmadi. Keyinroq qayta urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
          <span className="text-xl">🇨🇳</span>
          Xitoy bozori (Alibaba)
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {cached && (
            <span className="badge badge-ghost badge-sm text-base-content/40">cache</span>
          )}
          {rates && (
            <span className="text-xs text-primary/70 tabular-nums font-medium">
              💱 1 USD = {rates.usd.toLocaleString('ru-RU')} so'm
            </span>
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

      {/* Description — before load */}
      {!loaded && !loading && (
        <p className="text-sm text-base-content/50">
          Bu mahsulotning rasmi orqali Alibaba dan o'xshash xitoy mahsulotlarini topadi. Narx, MOQ va yetkazib beruvchi ma'lumotlari ko'rsatiladi.
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

      {/* Cards */}
      {loaded && !loading && items.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <p className="text-3xl">🔍</p>
          <p className="text-sm font-medium text-base-content/60">Bu mahsulot Alibaba da topilmadi</p>
          <p className="text-xs text-base-content/40">Ehtimol bu mahsulot Xitoy bozorida yo'q yoki rasm orqali aniqlab bo'lmadi</p>
        </div>
      )}

      {loaded && !loading && items.length > 0 && (() => {
        const filtered = (onlyCheaper && productPrice != null)
          ? items.filter((item) => {
              const min = parseMinPrice(item.price);
              return min != null && min < productPrice;
            })
          : items;
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        return (
        <>
        {filtered.length === 0 && (
          <div className="text-center py-6 text-base-content/40 text-sm">
            RIFT narxidan arzon mahsulot topilmadi
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {pageItems.map((item) => {
            const minPrice = parseMinPrice(item.price);
            const isCheaper = productPrice != null && minPrice != null && minPrice < productPrice;
            const saving = isCheaper && productPrice != null && minPrice != null
              ? Math.round(productPrice - minPrice)
              : null;
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
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base-content/20 text-2xl">
                    📦
                  </div>
                )}
                {/* Platform badge */}
                <span className="absolute top-2 left-2 bg-orange-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  Alibaba
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
                <p className="text-sm font-bold text-success tabular-nums">
                  {formatPrice(item.price)}
                </p>

                {/* UZS konvertatsiya */}
                {rates && (() => {
                  const minUsd = parseMinPrice(item.price);
                  if (!minUsd) return null;
                  const currency = item.price.match(/^([A-Z€¥£₩$]+)/)?.[1] ?? '';
                  const rate = currency === 'EUR' ? rates.eur : rates.usd;
                  const uzs = Math.round(minUsd * rate);
                  return (
                    <p className="text-[11px] text-primary/70 tabular-nums font-medium">
                      ≈ {uzs.toLocaleString('ru-RU')} so'm
                      <span className="ml-1 text-base-content/40 font-normal">({rates.date})</span>
                    </p>
                  );
                })()}

                {/* MOQ */}
                {item.moq && (
                  <p className="text-[11px] text-base-content/50">
                    Min: {item.moq}
                  </p>
                )}

                {/* Supplier */}
                {item.supplier && (
                  <p className="text-[10px] text-base-content/40 truncate mt-auto">
                    🏭 {item.supplier}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {item.reviewScore && item.reviewScore !== '' && (
                    <span className="text-[10px] text-yellow-400 flex items-center gap-0.5">
                      ★ {item.reviewScore}
                      {item.reviewCount && item.reviewCount !== '' && (
                        <span className="text-base-content/30">({item.reviewCount})</span>
                      )}
                    </span>
                  )}
                  {item.soldOrder && item.soldOrder !== '' && (
                    <span className="text-[10px] text-base-content/40">
                      {item.soldOrder} buyurtma
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
