import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SOURCE_META } from './types';
import {
  GlobeAltIcon,
  CalculatorIcon,
  MagnifyingGlassIcon,
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

  function marginInfo(extPriceUzs: number): { text: string; cls: string } | null {
    if (!uzumPrice || uzumPrice <= 0) return null;
    const landed = extPriceUzs * 1.3;
    const margin = ((uzumPrice - landed) / uzumPrice) * 100;
    if (margin >= 30) return { text: `+${margin.toFixed(0)}%`, cls: 'text-success' };
    if (margin >= 15) return { text: `+${margin.toFixed(0)}%`, cls: 'text-warning' };
    if (margin > 0)   return { text: `+${margin.toFixed(0)}%`, cls: 'text-orange-400' };
    return null;
  }

  const sorted = [...items].sort((a, b) => {
    const pa = parsePrice(a) ?? Infinity;
    const pb = parsePrice(b) ?? Infinity;
    return pa - pb;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allPrices = sorted.map(parsePrice).filter((p): p is number => p !== null);
  const minExtPrice = allPrices.length ? allPrices[0] : null;

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
            AliExpress · Alibaba · DHgate · Wildberries · Ozon · Trendyol · Hepsiburada
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-base-100 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-base-300/60" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-base-300/60 rounded w-full" />
                <div className="h-3 bg-base-300/60 rounded w-2/3" />
                <div className="h-4 bg-base-300/60 rounded w-1/2 mt-1" />
              </div>
            </div>
          ))}
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

      {/* Product grid — uzum.uz card style */}
      {!loading && sorted.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {visible.map((item, i) => {
              const sourceKey = (item.platform ?? item.source ?? '').toUpperCase();
              const meta = SOURCE_META[sourceKey] ?? { label: sourceKey || 'Global', flag: '🌐', color: 'badge-ghost' };
              const extPriceUzs = parsePrice(item);
              const mg = extPriceUzs ? marginInfo(extPriceUzs) : null;
              const rank = (page - 1) * PAGE_SIZE + i + 1;
              const isLowest = rank === 1 && page === 1;
              const imageUrl = item.image ?? item.image_url;
              const link = item.link ?? item.url;

              return (
                <div
                  key={`${page}-${i}`}
                  className="group bg-base-100 rounded-xl overflow-hidden border border-base-300/30 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  {/* Image — square, like uzum */}
                  <div className="relative aspect-square bg-base-200 overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          el.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CubeIcon className="w-10 h-10 text-base-content/15" />
                      </div>
                    )}

                    {/* Top-left: platform badge */}
                    <div className="absolute top-1.5 left-1.5">
                      <span className={`badge badge-xs ${meta.color} shadow-sm`}>
                        {meta.flag} {meta.label}
                      </span>
                    </div>

                    {/* Top-right: eng arzon OR rank */}
                    <div className="absolute top-1.5 right-1.5">
                      {isLowest ? (
                        <span className="badge badge-xs badge-success shadow-sm">🏆 Eng arzon</span>
                      ) : (
                        <span className="bg-black/40 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* Hover: Ko'rish button */}
                    {link && link !== '#' && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="btn btn-primary btn-sm gap-1.5 shadow-lg">
                          Ko'rish
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </span>
                      </a>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 space-y-1">
                    {/* Title */}
                    <p className="text-xs font-medium text-base-content/85 line-clamp-2 leading-snug min-h-[2.5rem]">
                      {item.title}
                    </p>

                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-primary">
                        {item.price ?? `$${(item.price_usd as number)?.toFixed(2)}`}
                      </span>
                      {mg && (
                        <span className={`text-[10px] font-semibold ${mg.cls}`}>
                          {mg.text}
                        </span>
                      )}
                    </div>

                    {/* UZS price */}
                    {extPriceUzs && (
                      <p className="text-[11px] text-base-content/40">
                        ≈ {extPriceUzs.toLocaleString()} so'm
                      </p>
                    )}

                    {/* Store */}
                    {(item.store ?? item.seller_name) && (
                      <p className="text-[10px] text-base-content/30 truncate">
                        {item.store ?? item.seller_name}
                      </p>
                    )}
                  </div>
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
                  className="join-item btn btn-sm btn-ghost"
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
                        className={`join-item btn btn-sm ${page === p ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPage(p as number)}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  className="join-item btn btn-sm btn-ghost"
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
