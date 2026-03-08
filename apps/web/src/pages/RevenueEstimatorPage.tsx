import { useState } from 'react';
import { revenueApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { BanknotesIcon, CalculatorIcon } from '../components/icons';
import { useI18n } from '../i18n/I18nContext';
import { PageHint } from '../components/PageHint';
import type { RevenueEstimate, CompetitionLevel } from '../api/types';

/** Extract numeric product ID from a full Uzum URL or plain ID string */
function extractProductId(input: string): string {
  const trimmed = input.trim();
  // Full URL: https://uzum.uz/ru/product/slug-12345 or /product/slug-12345?skuId=xxx
  const urlMatch = trimmed.match(/product\/[^/]*?-(\d+)/);
  if (urlMatch) return urlMatch[1];
  // Plain numeric ID
  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch) return numMatch[1];
  return trimmed;
}

const COMPETITION_COLORS: Record<CompetitionLevel, string> = {
  low: 'badge-success',
  medium: 'badge-warning',
  high: 'badge-error',
};

export function RevenueEstimatorPage() {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<RevenueEstimate | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const productId = extractProductId(input);
      const res = await revenueApi.getEstimate(productId);
      setResult(res.data as RevenueEstimate);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return value.toLocaleString('ru-RU');
  }

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      <PageHint page="revenue-estimator">{t('hints.analyze')}</PageHint>

      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <BanknotesIcon className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
          {t('revenue.title')}
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          {t('revenue.enterProduct')}
        </p>
      </div>

      {/* Input form */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6">
        <form onSubmit={handleCalculate} className="flex flex-col sm:flex-row gap-3 lg:gap-4">
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend text-xs">{t('revenue.enterProduct')}</legend>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
              className="input input-bordered w-full"
              placeholder="https://uzum.uz/ru/product/... or 12345"
            />
          </fieldset>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn btn-primary gap-2 sm:self-center sm:mt-4"
          >
            {loading
              ? <span className="loading loading-spinner loading-sm" />
              : <CalculatorIcon className="w-4 h-4" />}
            {loading ? t('common.calculating') : t('revenue.calculate')}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-5">
          {/* Product title */}
          <div>
            <p className="text-xs text-base-content/50 mb-1">#{result.product_id}</p>
            <h2 className="font-bold text-lg lg:text-xl leading-snug">{result.product_title}</h2>
          </div>

          <div className="divider my-0" />

          {/* Big number cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <RevenueCard
              label={t('revenue.monthlyRevenue')}
              value={`${formatCurrency(result.estimated_monthly_revenue)} ${t('common.som')}`}
              accent="text-primary"
              size="lg"
            />
            <RevenueCard
              label={t('revenue.estimatedMargin')}
              value={`${formatCurrency(result.estimated_margin_30pct)} ${t('common.som')}`}
              accent="text-success"
              size="lg"
            />
            <RevenueCard
              label={t('revenue.weeklySales')}
              value={`${result.weekly_bought.toLocaleString()} ${t('common.unit')}`}
              accent="text-secondary"
              size="lg"
            />
          </div>

          {/* Competition level */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-base-content/60">{t('revenue.competition')}:</span>
            <span className={`badge ${COMPETITION_COLORS[result.competition_level]} badge-lg font-semibold`}>
              {t(`revenue.${result.competition_level}`)}
            </span>
          </div>

          <div className="divider my-0" />

          {/* Price breakdown */}
          <div className="bg-base-300/40 rounded-xl p-4 border border-base-300/30">
            <p className="text-xs text-base-content/50 mb-3 font-semibold uppercase tracking-wide">
              {t('revenue.monthlyRevenue')}
            </p>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="font-mono font-bold text-base-content">
                {formatCurrency(result.sell_price)} {t('common.som')}
              </span>
              <span className="text-base-content/40">x</span>
              <span className="font-mono font-bold text-base-content">
                {result.weekly_bought} {t('common.perWeek')}
              </span>
              <span className="text-base-content/40">x</span>
              <span className="font-mono font-bold text-base-content">4</span>
              <span className="text-base-content/40">=</span>
              <span className="font-mono font-bold text-primary text-lg">
                {formatCurrency(result.estimated_monthly_revenue)} {t('common.som')}
              </span>
            </div>
          </div>

          {/* AI Recommendation */}
          {result.recommendation && (
            <>
              <div className="divider my-0" />
              <div>
                <p className="text-xs text-base-content/50 mb-2 flex items-center gap-1">
                  {t('revenue.recommendation')}
                </p>
                <div className="bg-base-300/40 rounded-xl p-4 border border-base-300/30 text-sm leading-relaxed">
                  {result.recommendation}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RevenueCard({
  label,
  value,
  accent,
  size = 'md',
}: {
  label: string;
  value: string;
  accent?: string;
  size?: 'md' | 'lg';
}) {
  return (
    <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
      <p className="text-xs text-base-content/50 mb-1">{label}</p>
      <p className={`font-bold tabular-nums ${accent ?? ''} ${size === 'lg' ? 'text-xl lg:text-2xl' : 'text-lg'}`}>
        {value}
      </p>
    </div>
  );
}
