import { useState } from 'react';
import { uzumApi, productsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { FireIcon, MagnifyingGlassIcon } from '../components/icons';
import { ScoreChart } from '../components/ScoreChart';
import { useI18n } from '../i18n/I18nContext';
import type { AnalyzeResult, Snapshot, ChartPoint } from '../api/types';

const MAX_SCORE = 10;

function ScoreRadial({ score }: { score: number }) {
  const pct = Math.min((score / MAX_SCORE) * 100, 100);
  const color =
    score >= 6 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#6b7280';

  return (
    <div
      className="radial-progress text-2xl lg:text-3xl font-bold"
      style={{ '--value': pct, '--size': '8rem', '--thickness': '6px', color } as any}
      role="progressbar"
    >
      {score.toFixed(2)}
    </div>
  );
}

export function AnalyzePage() {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [snapshots, setSnapshots] = useState<ChartPoint[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tracked, setTracked] = useState(false);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setSnapshots([]);
    setTracked(false);
    setLoading(true);
    try {
      const res = await uzumApi.analyzeUrl(url);
      const data: AnalyzeResult = res.data;
      setResult(data);

      try {
        const snap = await productsApi.getSnapshots(String(data.product_id));
        const chartData = snap.data
          .slice()
          .reverse()
          .map((s: Snapshot) => ({
            date: new Date(s.snapshot_at).toLocaleDateString('uz-UZ', {
              month: 'short',
              day: 'numeric',
            }),
            score: Number(Number(s.score).toFixed(4)),
          }));
        setSnapshots(chartData);
      } catch {
        // snapshot history optional
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('analyze.error')));
    } finally {
      setLoading(false);
    }
  }

  async function handleTrack() {
    if (!result) return;
    try {
      await productsApi.track(String(result.product_id));
    } catch {
      // already tracked — ignore
    }
    setTracked(true);
  }

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <MagnifyingGlassIcon className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
          {t('analyze.title')}
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          {t('analyze.subtitle')}
        </p>
      </div>

      {/* URL form */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6">
        <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3 lg:gap-4">
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend text-xs">{t('analyze.inputLabel')}</legend>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="input input-bordered w-full"
              placeholder="https://uzum.uz/ru/product/mahsulot-nomi-123456"
            />
            <p className="fieldset-label">
              {t('analyze.inputHelp')}
            </p>
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary gap-2 sm:self-center sm:mt-4"
          >
            {loading
              ? <span className="loading loading-spinner loading-sm" />
              : <MagnifyingGlassIcon className="w-4 h-4" />}
            {loading ? t('analyze.analyzing') : t('analyze.button')}
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

      {/* Result */}
      {result && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-5">
          {/* Title + score */}
          <div className="flex items-start gap-4 lg:gap-6 flex-wrap sm:flex-nowrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FireIcon className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="text-xs text-base-content/50">#{result.product_id}</span>
              </div>
              <h2 className="font-bold text-lg lg:text-xl leading-snug">{result.title}</h2>
            </div>
            <div className="shrink-0 text-center">
              <ScoreRadial score={result.score} />
              <p className="text-xs text-base-content/40 mt-1">Trend Score</p>
            </div>
          </div>

          <div className="divider my-0" />

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              label={t('analyze.totalOrders')}
              value={(result.orders_quantity ?? 0).toLocaleString()}
              accent="text-primary"
            />
            <StatCard
              label={t('analyze.recentActivity')}
              value={result.weekly_bought != null ? result.weekly_bought.toLocaleString() : 'N/A'}
              accent={result.weekly_bought ? 'text-success' : 'text-base-content/40'}
            />
            <StatCard
              label={t('analyze.rating')}
              value={`${result.rating}`}
              accent="text-yellow-400"
            />
            <StatCard
              label={t('analyze.reviews')}
              value={(result.feedback_quantity ?? 0).toLocaleString()}
              accent="text-secondary"
            />
            {result.sell_price != null && (
              <StatCard
                label={t('analyze.price')}
                value={`${result.sell_price.toLocaleString()} so'm`}
                accent="text-accent"
              />
            )}
          </div>

          {/* Score history chart */}
          {snapshots.length > 1 && (
            <>
              <div className="divider my-0" />
              <div>
                <p className="text-xs text-base-content/50 mb-2">{t('analyze.scoreHistory')}</p>
                <ScoreChart data={snapshots} />
              </div>
            </>
          )}

          {/* AI Explanation */}
          {result.ai_explanation && result.ai_explanation.length > 0 && (
            <>
              <div className="divider my-0" />
              <div>
                <p className="text-xs text-base-content/50 mb-2 flex items-center gap-1">
                  <span>🤖</span> {t('analyze.aiAnalysis')}
                </p>
                <ul className="space-y-1.5">
                  {result.ai_explanation.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Score formula hint */}
          <div className="alert alert-info alert-soft text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {t('analyze.scoreFormula')}
            </span>
          </div>

          {/* Actions */}
          <div className="card-actions justify-end">
            <button
              onClick={handleTrack}
              disabled={tracked}
              className={`btn btn-sm gap-2 ${tracked ? 'btn-success' : 'btn-outline btn-success'}`}
            >
              {tracked ? `✓ ${t('analyze.tracked')}` : `+ ${t('analyze.track')}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
      <p className="text-xs text-base-content/50 mb-1">{label}</p>
      <p className={`font-bold text-lg tabular-nums ${accent ?? ''}`}>{value}</p>
    </div>
  );
}
