import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uzumApi, productsApi, authApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useI18n } from '../i18n/I18nContext';
import { useAuthStore } from '../stores/authStore';
import type { AnalyzeResult } from '../api/types';

const STEPS = [1, 2, 3] as const;

export function OnboardingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);

  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [tracked, setTracked] = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await uzumApi.analyzeUrl(url);
      setResult(res.data as AnalyzeResult);
      await authApi.updateOnboarding({ step: 1 });
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('analyze.error')));
    } finally {
      setLoading(false);
    }
  }

  async function handleTrack() {
    if (!result) return;
    setTrackLoading(true);
    try {
      await productsApi.track(String(result.product_id));
      setTracked(true);
      await authApi.updateOnboarding({ step: 2 });
    } catch {
      // already tracked — treat as success
      setTracked(true);
    } finally {
      setTrackLoading(false);
    }
  }

  async function handleFinish() {
    try {
      await authApi.updateOnboarding({ completed: true, step: 3 });
    } catch {
      // non-critical — proceed anyway
    }
    setOnboardingCompleted(true);
    navigate('/');
  }

  function goToStep(next: number) {
    setStep(next);
  }

  const formatPrice = (price: number | null) => {
    if (price == null) return '-';
    return price.toLocaleString() + " so'm";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-secondary/3 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
            <span className="text-primary-content font-black text-2xl font-heading">V</span>
          </div>
          <h1 className="text-2xl font-black font-heading tracking-tight">{t('onboarding.title')}</h1>
        </div>

        {/* Step indicator */}
        <ul className="steps steps-horizontal w-full">
          {STEPS.map((s) => (
            <li
              key={s}
              className={`step ${s <= step ? 'step-primary' : ''}`}
            >
              {s === 1 ? t('onboarding.step1Title') : s === 2 ? t('onboarding.step2Title') : t('onboarding.step3Title')}
            </li>
          ))}
        </ul>

        {/* Card */}
        <div className="rounded-2xl bg-base-100 border border-base-300 shadow-xl p-6 lg:p-8">
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">{t('onboarding.step1Title')}</h2>
                <p className="text-base-content/50 text-sm mt-1">{t('onboarding.step1Desc')}</p>
              </div>

              {error && (
                <div role="alert" className="alert alert-error alert-soft py-2 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAnalyze} className="space-y-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">URL</legend>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    className="input input-bordered w-full"
                    placeholder={t('onboarding.urlPlaceholder')}
                  />
                </fieldset>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full shadow-lg shadow-primary/20"
                >
                  {loading && <span className="loading loading-spinner loading-sm" />}
                  {loading ? t('analyze.analyzing') : t('onboarding.analyze')}
                </button>
              </form>

              {/* Analysis result preview */}
              {result && (
                <div className="rounded-xl bg-base-200/50 border border-base-300/50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {result.photo_url && (
                      <img
                        src={result.photo_url}
                        alt={result.title}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{result.title}</p>
                      <p className="text-xs text-base-content/50 mt-0.5">{formatPrice(result.sell_price)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-base-100 p-2">
                      <p className="text-lg font-bold text-primary">{result.score.toFixed(1)}</p>
                      <p className="text-[10px] text-base-content/40 uppercase tracking-wider">Score</p>
                    </div>
                    <div className="rounded-lg bg-base-100 p-2">
                      <p className="text-lg font-bold">{result.orders_quantity?.toLocaleString() ?? '-'}</p>
                      <p className="text-[10px] text-base-content/40 uppercase tracking-wider">{t('analyze.totalOrders')}</p>
                    </div>
                    <div className="rounded-lg bg-base-100 p-2">
                      <p className="text-lg font-bold">{result.weekly_bought?.toLocaleString() ?? '-'}</p>
                      <p className="text-[10px] text-base-content/40 uppercase tracking-wider">{t('analyze.recentActivity')}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => goToStep(2)}
                    className="btn btn-primary btn-sm w-full"
                  >
                    {t('onboarding.next')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">{t('onboarding.step2Title')}</h2>
                <p className="text-base-content/50 text-sm mt-1">{t('onboarding.step2Desc')}</p>
              </div>

              {result && (
                <div className="rounded-xl bg-base-200/50 border border-base-300/50 p-4">
                  <div className="flex items-center gap-3">
                    {result.photo_url && (
                      <img
                        src={result.photo_url}
                        alt={result.title}
                        className="w-14 h-14 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{result.title}</p>
                      <p className="text-xs text-base-content/50 mt-0.5">
                        Score: <span className="text-primary font-bold">{result.score.toFixed(1)}</span>
                        {' | '}
                        {formatPrice(result.sell_price)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {tracked ? (
                <div role="alert" className="alert alert-success alert-soft py-3 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('analyze.tracked')}</span>
                </div>
              ) : (
                <button
                  onClick={handleTrack}
                  disabled={trackLoading}
                  className="btn btn-primary w-full shadow-lg shadow-primary/20"
                >
                  {trackLoading && <span className="loading loading-spinner loading-sm" />}
                  {t('onboarding.track')}
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => goToStep(3)}
                  className="btn btn-ghost flex-1 text-sm"
                >
                  {tracked ? t('onboarding.next') : t('onboarding.skip')}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">{t('onboarding.step3Title')}</h2>
                <p className="text-base-content/50 text-sm mt-1">{t('onboarding.step3Desc')}</p>
              </div>

              <div className="rounded-xl bg-base-200/50 border border-base-300/50 p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-info">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>

                <div>
                  <p className="font-semibold text-sm">@VentraBot</p>
                  <p className="text-xs text-base-content/50 mt-1">{t('onboarding.step3Desc')}</p>
                </div>

                <a
                  href="https://t.me/VentraBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-info btn-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  t.me/VentraBot
                </a>
              </div>

              <button
                onClick={handleFinish}
                className="btn btn-primary w-full shadow-lg shadow-primary/20"
              >
                {t('onboarding.finish')}
              </button>

              <button
                onClick={handleFinish}
                className="btn btn-ghost w-full text-sm"
              >
                {t('onboarding.later')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
