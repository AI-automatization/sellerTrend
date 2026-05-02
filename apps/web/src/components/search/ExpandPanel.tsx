import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uzumApi } from '../../api/client';
import { useI18n } from '../../i18n/I18nContext';
import type { AnalyzeResult } from '../../api/types';
import { getErrorMessage } from '../../utils/getErrorMessage';

interface ExpandPanelProps {
  productId: number;
  onClose: () => void;
  isTracked?: boolean;
}

const SCORE_THRESHOLDS = {
  GOOD: 7,
  MEDIUM: 4,
} as const;

function formatPrice(price: number): string {
  return price.toLocaleString('ru-RU');
}

function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.GOOD) return 'text-success';
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'text-warning';
  return 'text-error';
}

function getScoreProgressColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.GOOD) return 'progress-success';
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'progress-warning';
  return 'progress-error';
}

const MAX_SCORE = 10;

export function ExpandPanel({ productId, onClose, isTracked = false }: ExpandPanelProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const res = await uzumApi.analyzeById(String(productId));
        if (!cancelled) {
          setData(res.data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err, t('expand.error'), t));
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

  // Animate in after mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleClose() {
    setVisible(false);
    // Wait for animation to finish before unmounting
    const ANIMATION_MS = 200;
    setTimeout(onClose, ANIMATION_MS);
  }

  function handleRetry() {
    setLoading(true);
    setError('');
    uzumApi.analyzeById(String(productId))
      .then((res) => setData(res.data))
      .catch((err: unknown) => setError(getErrorMessage(err, t('expand.error'), t)))
      .finally(() => setLoading(false));
  }

  return (
    <div
      ref={panelRef}
      className={`col-span-full overflow-hidden transition-all duration-200 ease-out ${
        visible ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="rounded-2xl border border-base-300/50 bg-base-200/80 backdrop-blur-sm shadow-lg p-4 lg:p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="btn btn-ghost btn-sm btn-circle absolute top-3 right-3 z-10"
          aria-label={t('common.close')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="skeleton h-6 w-2/3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-5 w-24" />
                </div>
              ))}
            </div>
            <div className="skeleton h-4 w-40" />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <svg className="w-10 h-10 text-error/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-error/70">{error}</p>
            <button onClick={handleRetry} className="btn btn-sm btn-outline btn-error">
              {t('expand.retry')}
            </button>
          </div>
        )}

        {/* Data content */}
        {!loading && !error && data && (
          <div className="space-y-4">
            {/* Header */}
            <div className="pr-8">
              <h3 className="font-bold text-base lg:text-lg leading-snug line-clamp-2">
                {data.title}
              </h3>
              <button
                onClick={() => navigate(`/products/${data.product_id}`)}
                className="text-primary text-xs hover:underline mt-1 inline-flex items-center gap-1"
              >
                {t('expand.detailLink')}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
              {/* Price */}
              <div className="rounded-xl bg-base-100/60 p-3">
                <p className="text-xs text-base-content/40 mb-1">{t('expand.price')}</p>
                <p className="font-bold tabular-nums">
                  {data.sell_price != null && data.sell_price > 0 ? (
                    <>
                      {formatPrice(data.sell_price)}{' '}
                      <span className="text-xs font-normal text-base-content/40">{t('common.som')}</span>
                    </>
                  ) : (
                    <span className="text-base-content/30">--</span>
                  )}
                </p>
              </div>

              {/* Rating */}
              <div className="rounded-xl bg-base-100/60 p-3">
                <p className="text-xs text-base-content/40 mb-1">{t('expand.rating')}</p>
                <p className="font-bold tabular-nums flex items-center gap-1">
                  {data.rating != null ? (
                    <>
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {data.rating.toFixed(1)}
                      {data.feedback_quantity != null && (
                        <span className="text-xs font-normal text-base-content/40">
                          ({data.feedback_quantity.toLocaleString()})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-base-content/30">--</span>
                  )}
                </p>
              </div>

              {/* Orders */}
              <div className="rounded-xl bg-base-100/60 p-3">
                <p className="text-xs text-base-content/40 mb-1">{t('expand.orders')}</p>
                <p className="font-bold tabular-nums">
                  {data.orders_quantity != null ? (
                    data.orders_quantity.toLocaleString()
                  ) : (
                    <span className="text-base-content/30">--</span>
                  )}
                </p>
              </div>

              {/* Stock */}
              <div className="rounded-xl bg-base-100/60 p-3">
                <p className="text-xs text-base-content/40 mb-1">{t('expand.stock')}</p>
                <p className="font-bold tabular-nums">
                  {data.total_available_amount != null ? (
                    data.total_available_amount.toLocaleString()
                  ) : (
                    <span className="text-base-content/30">--</span>
                  )}
                </p>
              </div>
            </div>

            {/* Score section */}
            <div className="rounded-xl bg-base-100/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-base-content/40">{t('expand.score')}</p>
                <span className={`font-bold text-lg tabular-nums ${getScoreColor(data.score)}`}>
                  {data.score.toFixed(1)}
                  <span className="text-xs font-normal text-base-content/40"> / {MAX_SCORE}</span>
                </span>
              </div>
              <progress
                className={`progress w-full ${getScoreProgressColor(data.score)}`}
                value={data.score}
                max={MAX_SCORE}
              />
            </div>

            {/* Weekly bought */}
            {data.weekly_bought != null && data.weekly_bought > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
                <span className="text-base-content/60">
                  {t('expand.weeklyBought').replace('{count}', data.weekly_bought.toLocaleString())}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => navigate(`/products/${data.product_id}`)}
                className="btn btn-sm btn-primary gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                {t('expand.fullAnalysis')}
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
