import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SOURCE_META } from './types';

interface GlobalPriceComparisonProps {
  items: any[];
  loading: boolean;
  jobStatus: string | null;
  uzumPrice: number | null;
  usdRate: number;
}

export function GlobalPriceComparison({
  items, loading, jobStatus, uzumPrice, usdRate,
}: GlobalPriceComparisonProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 6);
  const USD_RATE = usdRate;

  function parsePrice(item: any): number | null {
    // Yangi format: price_usd raqam sifatida keladi
    if (typeof item.price_usd === 'number' && item.price_usd > 0) {
      return item.price_usd * USD_RATE;
    }
    // Eski format: price string sifatida keladi
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

  function marginLabel(extPriceUzs: number): { text: string; cls: string } | null {
    if (!uzumPrice || uzumPrice <= 0) return null;
    const landed = extPriceUzs * 1.3;
    const margin = ((uzumPrice - landed) / uzumPrice) * 100;
    if (margin >= 30) return { text: `+${margin.toFixed(0)}% margin`, cls: 'text-success' };
    if (margin >= 15) return { text: `+${margin.toFixed(0)}% margin`, cls: 'text-warning' };
    if (margin > 0)   return { text: `+${margin.toFixed(0)}% margin`, cls: 'text-error' };
    return { text: 'Zararli', cls: 'text-error' };
  }

  return (
    <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
            <span>🌏</span> Global Bozor Taqqoslash
          </h2>
          <p className="text-xs text-base-content/50 mt-0.5">
            1688, Taobao, Alibaba, Banggood, Shopee global narxlari
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
            <span className="badge badge-error badge-sm">Xato</span>
          )}
          <Link to="/sourcing" className="btn btn-outline btn-xs gap-1">
            Cargo kalkulyator ↗
          </Link>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <p className="text-xs text-base-content/50 flex items-center gap-2">
            <span className="loading loading-spinner loading-xs" />
            Banggood va Shopee dan narxlar qidirilmoqda...
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-base-300/60 rounded-xl p-4 space-y-2 animate-pulse">
                <div className="h-20 bg-base-content/5 rounded-lg" />
                <div className="h-3 bg-base-content/10 rounded w-3/4" />
                <div className="h-4 bg-base-content/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          {uzumPrice && (() => {
            const prices = items.map((it) => parsePrice(it)).filter((p): p is number => p !== null);
            if (prices.length === 0) return null;
            const minExt = Math.min(...prices);
            const diff = ((uzumPrice - minExt) / uzumPrice) * 100;
            return (
              <div className="grid grid-cols-3 gap-2 bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
                <div className="text-center">
                  <p className="text-xs text-base-content/40">Uzumda narx</p>
                  <p className="font-bold text-sm">{uzumPrice.toLocaleString()} so'm</p>
                </div>
                <div className="text-center flex items-center justify-center">
                  <span className="text-2xl">↔</span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-base-content/40">Eng arzon xalq. narx</p>
                  <p className="font-bold text-sm text-primary">{minExt.toLocaleString()} so'm</p>
                  {diff > 0 && <p className="text-xs text-success mt-0.5">Farq: {diff.toFixed(0)}%</p>}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {visible.map((item, i) => {
              const sourceKey = (item.platform ?? item.source ?? '').toUpperCase();
              const meta = SOURCE_META[sourceKey] ?? { label: sourceKey, flag: '🌐', color: 'badge-ghost' };
              const extPriceUzs = parsePrice(item);
              const mg = extPriceUzs ? marginLabel(extPriceUzs) : null;

              return (
                <div key={i} className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 flex flex-col gap-2 hover:bg-base-content/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className={`badge badge-xs ${meta.color}`}>{meta.flag} {meta.label}</span>
                    {mg && <span className={`text-xs font-medium ${mg.cls}`}>{mg.text}</span>}
                  </div>
                  {(item.image ?? item.image_url) ? (
                    <img src={item.image ?? item.image_url} alt={item.title}
                      className="w-full h-24 object-contain rounded-lg bg-base-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-24 rounded-lg bg-base-200 flex items-center justify-center text-3xl">📦</div>
                  )}
                  <p className="text-xs leading-snug line-clamp-2 text-base-content/80 flex-1">{item.title}</p>
                  <p className="font-bold text-base text-primary leading-none">
                    {item.price ?? `$${(item.price_usd as number)?.toFixed(2)}`}
                  </p>
                  {extPriceUzs && <p className="text-xs text-base-content/40">≈ {extPriceUzs.toLocaleString()} so'm</p>}
                  {(item.store ?? item.seller_name) && (
                    <p className="text-xs text-base-content/40 truncate">{item.store ?? item.seller_name}</p>
                  )}
                  <div className="flex gap-1 mt-auto">
                    {(item.link ?? item.url) && (item.link ?? item.url) !== '#' ? (
                      <a href={item.link ?? item.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-xs flex-1">Ko'rish ↗</a>
                    ) : (
                      <span className="btn btn-xs btn-disabled flex-1">Demo</span>
                    )}
                    <Link to="/sourcing" className="btn btn-ghost btn-xs" title="Cargo kalkulyatorda hisoblash">🧮</Link>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length > 6 && (
            <button onClick={() => setExpanded(!expanded)} className="btn btn-ghost btn-sm w-full">
              {expanded ? '↑ Kamroq ko\'rsatish' : `↓ Yana ${items.length - 6} ta natija`}
            </button>
          )}
        </>
      )}

      {!loading && items.length === 0 && jobStatus !== 'PENDING' && jobStatus !== 'RUNNING' && (
        <div className="text-center py-8 text-base-content/30">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm">Global bozorda natija topilmadi</p>
        </div>
      )}
    </div>
  );
}
