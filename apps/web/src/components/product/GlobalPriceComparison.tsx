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

const PAGE_SIZE = 5;

export function GlobalPriceComparison({
  items, loading, jobStatus, uzumPrice, usdRate,
}: GlobalPriceComparisonProps) {
  const [page, setPage] = useState(1);
  const USD_RATE = usdRate;

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function parsePrice(item: any): number | null {
    if (typeof item.price_usd === 'number' && item.price_usd > 0) {
      return item.price_usd * USD_RATE;
    }
    if (typeof item.price === 'string') {
      const m = item.price.match(/[\d.,]+/);
      if (!m) return null;
      const n = parseFloat(m[0].replace(',', '.'));
      if (isNaN(n)) return null;
      if (item.price.includes('$') || n < 10000) return n * USD_RATE;
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

  const allPrices = items.map(parsePrice).filter((p): p is number => p !== null);
  const minExtPrice = allPrices.length ? Math.min(...allPrices) : null;

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
            1688 · Taobao · Alibaba · Banggood · Shopee · Google Shopping
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
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 bg-base-300/50 rounded-2xl p-4 animate-pulse">
                <div className="w-20 h-20 shrink-0 rounded-xl bg-base-content/10" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-base-content/10 rounded w-3/4" />
                  <div className="h-3 bg-base-content/10 rounded w-1/2" />
                  <div className="h-5 bg-base-content/10 rounded w-1/3" />
                </div>
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

      {/* Product list — overflow scroll */}
      {!loading && items.length > 0 && (
        <div className="space-y-3">
          <div className="max-h-[560px] overflow-y-auto space-y-3 pr-1">
            {visible.map((item, i) => {
              const sourceKey = (item.platform ?? item.source ?? '').toUpperCase();
              const meta = SOURCE_META[sourceKey] ?? { label: sourceKey || 'Global', flag: '🌐', color: 'badge-ghost' };
              const extPriceUzs = parsePrice(item);
              const mg = extPriceUzs ? marginInfo(extPriceUzs) : null;
              const rank = (page - 1) * PAGE_SIZE + i + 1;

              return (
                <div
                  key={`${page}-${i}`}
                  className="group flex gap-3 sm:gap-4 bg-base-100/50 border border-base-300/40 hover:border-primary/30 hover:bg-base-100/80 rounded-2xl p-3 sm:p-4 transition-all duration-200"
                >
                  {/* Rank */}
                  <div className="shrink-0 w-6 flex items-start justify-center pt-1">
                    <span className="text-xs font-bold text-base-content/25 tabular-nums">{rank}</span>
                  </div>

                  {/* Image */}
                  <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-base-200 border border-base-300/30 flex items-center justify-center">
                    {(item.image ?? item.image_url) ? (
                      <img
                        src={item.image ?? item.image_url}
                        alt={item.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          el.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                        }}
                      />
                    ) : (
                      <CubeIcon className="w-8 h-8 text-base-content/20" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    {/* Platform badge + margin */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge badge-xs ${meta.color} gap-1`}>
                        {meta.flag} {meta.label}
                      </span>
                      {mg && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md border ${mg.bg} ${mg.cls}`}>
                          {mg.text} margin
                        </span>
                      )}
                      {item.ai_match_score != null && (
                        <span className="text-xs text-base-content/40 ml-auto hidden sm:flex items-center gap-1">
                          <SparklesIcon className="w-3 h-3" />
                          {(item.ai_match_score * 100).toFixed(0)}% mos
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-sm leading-snug line-clamp-2 text-base-content/85 font-medium">
                      {item.title}
                    </p>

                    {/* Price + actions */}
                    <div className="flex items-end justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-bold text-lg text-primary leading-none">
                          {item.price ?? `$${(item.price_usd as number)?.toFixed(2)}`}
                        </p>
                        {extPriceUzs && (
                          <p className="text-xs text-base-content/40 mt-0.5">
                            ≈ {extPriceUzs.toLocaleString()} so'm
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(item.store ?? item.seller_name) && (
                          <span className="text-xs text-base-content/40 hidden sm:block truncate max-w-28">
                            {item.store ?? item.seller_name}
                          </span>
                        )}
                        {(item.link ?? item.url) && (item.link ?? item.url) !== '#' && (
                          <a
                            href={item.link ?? item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary btn-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Ko'rish
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                          </a>
                        )}
                        <Link to="/sourcing" className="btn btn-ghost btn-xs" title="Cargo hisoblash">
                          <CalculatorIcon className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-base-content/40">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, items.length)} / {items.length} ta natija
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
                        onClick={() => setPage(p as number)}
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
