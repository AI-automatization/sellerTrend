import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SOURCE_META } from './types';
import {
  GlobeAltIcon,
  CalculatorIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CubeIcon,
} from '../icons';

interface GlobalPriceComparisonProps {
  items: any[];
  loading: boolean;
  jobStatus: string | null;
  uzumPrice: number | null;
  usdRate: number;
}

const PAGE_SIZE = 8;

export function GlobalPriceComparison({
  items, loading, jobStatus, uzumPrice, usdRate,
}: GlobalPriceComparisonProps) {
  const [page, setPage] = useState(1);

  function parsePrice(item: any): number | null {
    if (typeof item.price_usd === 'number' && item.price_usd > 0) {
      return item.price_usd * usdRate;
    }
    if (typeof item.price === 'string') {
      const m = item.price.match(/[\d.,]+/);
      if (!m) return null;
      const n = parseFloat(m[0].replace(',', '.'));
      if (isNaN(n)) return null;
      if (item.price.includes('$') || n < 10000) return n * usdRate;
      return n;
    }
    return null;
  }

  function marginInfo(extPriceUzs: number): { text: string; cls: string; bg: string } | null {
    if (!uzumPrice || uzumPrice <= 0) return null;
    const landed = extPriceUzs * 1.3;
    const margin = ((uzumPrice - landed) / uzumPrice) * 100;
    if (margin >= 30) return { text: `+${margin.toFixed(0)}%`, cls: 'text-success', bg: 'bg-success/10 border-success/30' };
    if (margin >= 15) return { text: `+${margin.toFixed(0)}%`, cls: 'text-warning', bg: 'bg-warning/10 border-warning/30' };
    if (margin > 0)   return { text: `+${margin.toFixed(0)}%`, cls: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' };
    return { text: 'Zarar', cls: 'text-error', bg: 'bg-error/10 border-error/30' };
  }

  // Narx bo'yicha o'sish tartibida sort (null narxlar oxirida)
  const sorted = [...items].sort((a, b) => {
    const pa = parsePrice(a) ?? Infinity;
    const pb = parsePrice(b) ?? Infinity;
    return pa - pb;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allPrices = sorted.map(parsePrice).filter((p): p is number => p !== null);
  const minExtPrice = allPrices.length ? allPrices[0] : null; // sorted, so first = min

  return (
    <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5 text-primary" />
            Global Bozor Taqqoslash
          </h2>
          <p className="text-xs text-base-content/50 mt-0.5">
            Alibaba · AliExpress · DHgate · Shopee · Google Shopping
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(jobStatus === 'PENDING' || jobStatus === 'RUNNING') && (
            <span className="badge badge-ghost badge-sm gap-1">
              <span className="loading loading-spinner loading-xs" />
              Qidirilmoqda...
            </span>
          )}
          {jobStatus === 'DONE' && items.length > 0 && (
            <span className="badge badge-success badge-sm">{items.length} ta natija</span>
          )}
          {jobStatus === 'FAILED' && (
            <span className="badge badge-error badge-sm">Xato yuz berdi</span>
          )}
          <Link to="/sourcing" className="btn btn-outline btn-xs gap-1">
            <CalculatorIcon className="w-3.5 h-3.5" />
            Cargo kalkulyator
          </Link>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <p className="text-xs text-base-content/50 flex items-center gap-2">
            <span className="loading loading-spinner loading-xs" />
            Global platformalardan narxlar qidirilmoqda...
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-base-300/50 rounded-xl p-3 animate-pulse space-y-2">
                <div className="flex gap-2">
                  <div className="w-12 h-12 shrink-0 rounded-lg bg-base-content/10" />
                  <div className="flex-1 space-y-1.5 pt-0.5">
                    <div className="h-2.5 bg-base-content/10 rounded w-2/3" />
                    <div className="h-2.5 bg-base-content/10 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-4 bg-base-content/10 rounded w-1/3" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      {!loading && uzumPrice && minExtPrice && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 bg-base-300/50 border border-base-300/40 rounded-xl p-3 lg:p-4">
          <div className="text-center">
            <p className="text-xs text-base-content/40 mb-1">Uzumda narx</p>
            <p className="font-bold text-sm lg:text-base">{uzumPrice.toLocaleString()} so'm</p>
          </div>
          <div className="text-center flex flex-col items-center justify-center">
            <ArrowTrendingUpIcon className="w-5 h-5 opacity-30" />
          </div>
          <div className="text-center">
            <p className="text-xs text-base-content/40 mb-1">Eng arzon import</p>
            <p className="font-bold text-sm lg:text-base text-primary">{minExtPrice.toLocaleString()} so'm</p>
            {(() => {
              const diff = ((uzumPrice - minExtPrice) / uzumPrice) * 100;
              return diff > 0
                ? <p className="text-xs text-success mt-0.5">Farq: {diff.toFixed(0)}%</p>
                : null;
            })()}
          </div>
        </div>
      )}

      {/* Product grid */}
      {!loading && sorted.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {visible.map((item, i) => {
              const sourceKey = (item.platform ?? item.source ?? '').toUpperCase();
              const meta = SOURCE_META[sourceKey] ?? { label: sourceKey || 'Global', flag: '🌐', color: 'badge-ghost' };
              const extPriceUzs = parsePrice(item);
              const mg = extPriceUzs ? marginInfo(extPriceUzs) : null;
              const rank = (page - 1) * PAGE_SIZE + i + 1;
              const isLowest = rank === 1 && page === 1;

              return (
                <div
                  key={`${page}-${i}`}
                  className={`group relative flex flex-col gap-2 bg-base-100/60 border rounded-xl p-3 transition-all duration-200 hover:shadow-md hover:bg-base-100/90 ${
                    isLowest ? 'border-success/40 bg-success/5' : 'border-base-300/40 hover:border-primary/30'
                  }`}
                >
                  {/* Rank badge */}
                  <span className="absolute top-2 right-2 text-[10px] font-bold text-base-content/20 tabular-nums">
                    #{rank}
                  </span>

                  {/* Image + platform */}
                  <div className="flex gap-2 items-start">
                    <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-base-200 border border-base-300/30 flex items-center justify-center">
                      {(item.image ?? item.image_url) ? (
                        <img
                          src={item.image ?? item.image_url}
                          alt={item.title}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <CubeIcon className="w-6 h-6 text-base-content/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5 space-y-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`badge badge-xs ${meta.color} gap-0.5 shrink-0`}>
                          {meta.flag} {meta.label}
                        </span>
                        {isLowest && (
                          <span className="badge badge-xs badge-success shrink-0">Eng arzon</span>
                        )}
                      </div>
                      <p className="text-xs leading-snug line-clamp-2 text-base-content/80 font-medium">
                        {item.title}
                      </p>
                    </div>
                  </div>

                  {/* Price row */}
                  <div className="flex items-end justify-between gap-1 mt-auto">
                    <div>
                      <p className="font-bold text-base text-primary leading-none">
                        {item.price ?? `$${(item.price_usd as number)?.toFixed(2)}`}
                      </p>
                      {extPriceUzs && (
                        <p className="text-[11px] text-base-content/40 mt-0.5">
                          ≈ {extPriceUzs.toLocaleString()} so'm
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {mg && (
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded border ${mg.bg} ${mg.cls}`}>
                          {mg.text}
                        </span>
                      )}
                      {(item.link ?? item.url) && (item.link ?? item.url) !== '#' && (
                        <a
                          href={item.link ?? item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-xs p-1 min-h-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Ko'rish"
                        >
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Store + AI match */}
                  {(item.store ?? item.seller_name ?? item.ai_match_score != null) && (
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-base-300/20">
                      {(item.store ?? item.seller_name) && (
                        <span className="text-[10px] text-base-content/35 truncate">
                          {item.store ?? item.seller_name}
                        </span>
                      )}
                      {item.ai_match_score != null && (
                        <span className="text-[10px] text-base-content/35 flex items-center gap-0.5 shrink-0 ml-auto">
                          <SparklesIcon className="w-2.5 h-2.5" />
                          {(item.ai_match_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-base-content/40">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} / {sorted.length} ta natija
              </p>
              <div className="join">
                <button
                  className="join-item btn btn-sm btn-ghost rounded-l-lg"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <button key={`dots-${idx}`} className="join-item btn btn-sm btn-disabled btn-ghost">…</button>
                    ) : (
                      <button
                        key={p}
                        className={`join-item btn btn-sm rounded-lg ${page === p ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => { setPage(p as number); }}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  className="join-item btn btn-sm btn-ghost rounded-r-lg"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && jobStatus !== 'PENDING' && jobStatus !== 'RUNNING' && (
        <div className="text-center py-10 text-base-content/30">
          <MagnifyingGlassIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Global bozorda natija topilmadi</p>
          <p className="text-xs mt-1 opacity-60">Qidiruv so'rovini o'zgartiring yoki keyinroq urinib ko'ring</p>
        </div>
      )}
    </div>
  );
}
