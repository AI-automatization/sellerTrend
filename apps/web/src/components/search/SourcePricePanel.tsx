import { useState, useEffect } from 'react';
import { productsApi } from '../../api/client';
import { useI18n } from '../../i18n/I18nContext';
import { getErrorMessage } from '../../utils/getErrorMessage';
import type { SourcingComparison, BrightDataProduct, SourcingPlatform } from '../../api/types';

interface SourcePricePanelProps {
  productId: string;
  uzumPrice: number | null;
}

const EXCHANGE_RATE = 12_800;

const MAX_RESULTS_PER_PLATFORM = 3;

const PLATFORM_CONFIG: Record<SourcingPlatform, { label: string; color: string; bgClass: string; badgeClass: string }> = {
  aliexpress: {
    label: 'AliExpress',
    color: '#E62E04',
    bgClass: 'bg-[#E62E04]/10',
    badgeClass: 'bg-[#E62E04] text-white',
  },
  '1688': {
    label: '1688.com',
    color: '#2563EB',
    bgClass: 'bg-[#2563EB]/10',
    badgeClass: 'bg-[#2563EB] text-white',
  },
  taobao: {
    label: 'Taobao',
    color: '#16A34A',
    bgClass: 'bg-[#16A34A]/10',
    badgeClass: 'bg-[#16A34A] text-white',
  },
};

const PLATFORM_ORDER: SourcingPlatform[] = ['aliexpress', '1688', 'taobao'];

function calcMargin(uzumPrice: number | null, priceUsd: number): string | null {
  if (uzumPrice == null || uzumPrice <= 0) return null;
  const costUzs = priceUsd * EXCHANGE_RATE;
  if (costUzs <= 0) return null;
  const margin = ((uzumPrice - costUzs) / uzumPrice) * 100;
  return margin.toFixed(1);
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function truncateTitle(title: string, maxLen = 60): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen).trimEnd() + '...';
}

export function SourcePricePanel({ productId, uzumPrice }: SourcePricePanelProps) {
  const { t } = useI18n();
  const [data, setData] = useState<SourcingComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const res = await productsApi.getSourcingComparison(productId);
        if (!cancelled) {
          setData(res.data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err, t('sourcing.panel.error'), t));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [productId, t]);

  function handleRetry() {
    setLoading(true);
    setError('');
    productsApi.getSourcingComparison(productId)
      .then((res) => setData(res.data))
      .catch((err: unknown) => setError(getErrorMessage(err, t('sourcing.panel.error'), t)))
      .finally(() => setLoading(false));
  }

  // Check if all platforms have zero results
  const hasResults = data != null && PLATFORM_ORDER.some(
    (p) => data.platforms[p].length > 0,
  );

  // Loading state
  if (loading) {
    return (
      <div className="mt-4 rounded-xl border border-base-300/50 bg-base-100/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="loading loading-spinner loading-sm text-primary" />
          <span className="text-sm text-base-content/50">{t('sourcing.panel.loading')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg bg-base-200/60 p-3">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mt-4 rounded-xl border border-error/20 bg-error/5 p-4">
        <div className="flex flex-col items-center justify-center gap-2 py-2">
          <svg className="w-8 h-8 text-error/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-error/70">{error}</p>
          <button onClick={handleRetry} className="btn btn-sm btn-outline btn-error">
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!hasResults) {
    return (
      <div className="mt-4 rounded-xl border border-base-300/50 bg-base-100/40 p-4">
        <div className="flex items-center justify-center gap-2 py-4">
          <svg className="w-5 h-5 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
          <span className="text-sm text-base-content/40">{t('sourcing.panel.noResults')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-base-300/50 bg-base-100/40 p-4">
      {/* Header */}
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        {t('sourcing.panel.title')}
      </h4>

      {/* Platform cards — horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-x-visible">
        {PLATFORM_ORDER.map((platformKey) => {
          const config = PLATFORM_CONFIG[platformKey];
          const items = data.platforms[platformKey];
          if (items.length === 0) return null;

          // Sort by priceUsd ascending, take top 3
          const sorted = [...items]
            .sort((a, b) => a.priceUsd - b.priceUsd)
            .slice(0, MAX_RESULTS_PER_PLATFORM);

          return (
            <PlatformCard
              key={platformKey}
              config={config}
              items={sorted}
              uzumPrice={uzumPrice}
              t={t}
              isCheapest={sorted[0]?.priceUsd === Math.min(
                ...PLATFORM_ORDER.flatMap(p => data.platforms[p].map(i => i.priceUsd)).filter(v => v > 0),
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

interface PlatformCardProps {
  config: { label: string; color: string; bgClass: string; badgeClass: string };
  items: BrightDataProduct[];
  uzumPrice: number | null;
  t: (key: string) => string;
  isCheapest: boolean;
}

function PlatformCard({ config, items, uzumPrice, t, isCheapest }: PlatformCardProps) {
  return (
    <div className={`min-w-[260px] md:min-w-0 rounded-lg ${config.bgClass} p-3 flex flex-col gap-2`}>
      {/* Platform badge */}
      <div className="flex items-center gap-2">
        <span className={`badge badge-sm ${config.badgeClass}`}>
          {config.label}
        </span>
        {isCheapest && (
          <span className="badge badge-xs badge-warning">
            {t('sourcing.panel.cheapest')}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => {
          const margin = calcMargin(uzumPrice, item.priceUsd);

          return (
            <div key={idx} className="rounded-md bg-base-100/80 p-2 text-xs space-y-1">
              {/* Title */}
              <p className="font-medium leading-snug line-clamp-2" title={item.title}>
                {truncateTitle(item.title)}
              </p>

              {/* Price row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tabular-nums">{formatUsd(item.priceUsd)}</span>
                  {item.currency !== 'USD' && (
                    <span className="text-base-content/40">
                      ({item.price.toLocaleString()} {item.currency})
                    </span>
                  )}
                </div>
                {margin != null && (
                  <span
                    className={`badge badge-xs tabular-nums ${
                      parseFloat(margin) >= 30
                        ? 'badge-success'
                        : parseFloat(margin) >= 10
                          ? 'badge-warning'
                          : 'badge-error'
                    }`}
                  >
                    {t('sourcing.panel.margin')}: {margin}%
                  </span>
                )}
              </div>

              {/* Meta row: rating + orders */}
              <div className="flex items-center gap-2 text-base-content/40">
                {item.rating != null && item.rating > 0 && (
                  <span className="flex items-center gap-0.5">
                    <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {item.rating.toFixed(1)}
                  </span>
                )}
                {item.orders != null && item.orders > 0 && (
                  <span>{item.orders.toLocaleString()} orders</span>
                )}
              </div>

              {/* Visit site link */}
              <a
                href={item.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {t('sourcing.panel.visitSite')}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
