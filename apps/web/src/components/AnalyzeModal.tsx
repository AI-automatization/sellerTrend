import { useState, useEffect } from 'react';
import { uzumApi, productsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { MagnifyingGlassIcon, FireIcon } from './icons';
import { ScoreChart } from './ScoreChart';
import { useI18n } from '../i18n/I18nContext';
import type { AnalyzeResult, Snapshot, ChartPoint } from '../api/types';

const MAX_SCORE = 10;

type RadialProgressStyle = React.CSSProperties & {
  '--value': number;
  '--size': string;
  '--thickness': string;
};

function ScoreRadial({ score }: { score: number }) {
  const pct = Math.min((score / MAX_SCORE) * 100, 100);
  const color = score >= 6 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#6b7280';
  const radialStyle: RadialProgressStyle = {
    '--value': pct,
    '--size': '7rem',
    '--thickness': '6px',
    color,
  };
  return (
    <div className="radial-progress text-2xl font-bold" style={radialStyle} role="progressbar">
      {score.toFixed(2)}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-base-200/60 border border-base-300/30 p-3">
      <p className="text-[10px] text-base-content/40 uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-bold text-base tabular-nums ${accent ?? ''}`}>{value}</p>
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyzeModal({ isOpen, onClose }: Props) {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [snapshots, setSnapshots] = useState<ChartPoint[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tracked, setTracked] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setResult(null);
      setSnapshots([]);
      setError('');
      setLoading(false);
      setTracked(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

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
            date: new Date(s.snapshot_at).toLocaleDateString('ru-RU', {
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
      setTracked(true);
      window.dispatchEvent(new CustomEvent('product-tracked'));
    } catch {
      // already tracked — ignore
    }
  }

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open z-50">
      <div className="modal-box w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300/40 sticky top-0 bg-base-100 z-10">
          <div className="flex items-center gap-2">
            <MagnifyingGlassIcon className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">{t('analyze.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square rounded-lg text-base-content/40 hover:text-base-content"
            aria-label="Yopish"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* URL form */}
          <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
            <fieldset className="fieldset flex-1">
              <legend className="fieldset-legend text-xs">{t('analyze.inputLabel')}</legend>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                autoFocus
                className="input input-bordered w-full"
                placeholder={t('analyze.urlPlaceholder')}
              />
              <p className="fieldset-label text-xs">{t('analyze.inputHelp')}</p>
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

          {/* Error */}
          {error && (
            <div role="alert" className="alert alert-error alert-soft text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-2xl bg-base-200/50 border border-base-300/40 p-4 space-y-4">
              {/* Title + score */}
              <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FireIcon className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="text-xs text-base-content/40">#{result.product_id}</span>
                  </div>
                  <h4 className="font-bold text-base leading-snug">{result.title}</h4>
                </div>
                <div className="shrink-0 text-center">
                  <ScoreRadial score={result.score} />
                  <p className="text-[10px] text-base-content/40 mt-1 uppercase tracking-wider">Trend Score</p>
                </div>
              </div>

              <div className="h-px bg-base-300/30" />

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StatCard label={t('analyze.totalOrders')} value={(result.orders_quantity ?? 0).toLocaleString()} accent="text-primary" />
                <StatCard
                  label={t('analyze.recentActivity')}
                  value={result.weekly_bought != null ? result.weekly_bought.toLocaleString() : 'N/A'}
                  accent={result.weekly_bought ? 'text-success' : 'text-base-content/40'}
                />
                <StatCard label={t('analyze.rating')} value={`${result.rating}`} accent="text-yellow-400" />
                <StatCard label={t('analyze.reviews')} value={(result.feedback_quantity ?? 0).toLocaleString()} accent="text-secondary" />
                {result.sell_price != null && (
                  <StatCard label={t('analyze.price')} value={`${result.sell_price.toLocaleString()} so'm`} accent="text-accent" />
                )}
              </div>

              {/* Score history */}
              {snapshots.length > 1 && (
                <>
                  <div className="h-px bg-base-300/30" />
                  <div>
                    <p className="text-xs text-base-content/40 mb-2">{t('analyze.scoreHistory')}</p>
                    <ScoreChart data={snapshots} />
                  </div>
                </>
              )}

              {/* AI explanation */}
              {result.ai_explanation && result.ai_explanation.length > 0 && (
                <>
                  <div className="h-px bg-base-300/30" />
                  <div>
                    <p className="text-xs text-base-content/40 mb-2 flex items-center gap-1">
                      <span>🤖</span> {t('analyze.aiAnalysis')}
                    </p>
                    <ul className="space-y-1.5">
                      {result.ai_explanation.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-1">
                <div className="alert alert-info alert-soft text-xs flex-1 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('analyze.scoreFormula')}</span>
                </div>
                <button
                  onClick={handleTrack}
                  disabled={tracked}
                  className={`btn btn-sm gap-2 shrink-0 ${tracked ? 'btn-success' : 'btn-outline btn-success'}`}
                >
                  {tracked
                    ? <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> {t('analyze.tracked')}</>
                    : `+ ${t('analyze.track')}`
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </dialog>
  );
}
