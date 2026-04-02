import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uzumApi, productsApi, authApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useI18n } from '../i18n/I18nContext';
import type { AnalyzeResult } from '../api/types';
import {
  RiSearchLine,
  RiBookmarkLine,
  RiTelegramLine,
  RiCheckLine,
  RiAlertLine,
  RiArrowRightLine,
  RiStarLine,
  RiShoppingCart2Line,
  RiPulseLine,
  RiExternalLinkLine,
} from 'react-icons/ri';

const STEPS = [1, 2, 3] as const;
type Step = (typeof STEPS)[number];

const STEP_META: Record<Step, { icon: React.ReactNode; color: string }> = {
  1: { icon: <RiSearchLine size={18} />,    color: 'text-primary bg-primary/10' },
  2: { icon: <RiBookmarkLine size={18} />,  color: 'text-secondary bg-secondary/10' },
  3: { icon: <RiTelegramLine size={18} />,  color: 'text-info bg-info/10' },
};

export function OnboardingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
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
      setTracked(true);
    } finally {
      setTrackLoading(false);
    }
  }

  async function handleFinish() {
    try {
      await authApi.updateOnboarding({ completed: true, step: 3 });
    } catch {
      // non-critical
    }
    navigate('/');
  }

  const formatPrice = (price: number | null) => {
    if (price == null) return '-';
    return price.toLocaleString() + " so'm";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-secondary/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-5">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
            <span className="text-primary-content font-black text-xl font-heading">V</span>
          </div>
          <h1 className="text-xl font-black font-heading tracking-tight">{t('onboarding.title')}</h1>
          <p className="text-base-content/40 text-sm mt-0.5">VENTRA Analytics</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s) => {
            const meta = STEP_META[s];
            const isActive = s === step;
            const isDone = s < step;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-content shadow-sm shadow-primary/30'
                    : isDone
                    ? 'bg-success/15 text-success'
                    : 'bg-base-300/60 text-base-content/30'
                }`}>
                  {isDone ? <RiCheckLine size={12} /> : meta.icon}
                  <span className={isActive || isDone ? '' : 'hidden sm:inline'}>
                    {s === 1 ? t('onboarding.step1Title') : s === 2 ? t('onboarding.step2Title') : t('onboarding.step3Title')}
                  </span>
                </div>
                {s < 3 && (
                  <div className={`w-6 h-px ${s < step ? 'bg-success/40' : 'bg-base-300/60'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-base-100 border border-base-300/60 shadow-xl overflow-hidden">
          {/* Step header bar */}
          <div className={`px-6 py-4 border-b border-base-300/40 flex items-center gap-3 ${
            step === 1 ? 'bg-primary/5' : step === 2 ? 'bg-secondary/5' : 'bg-info/5'
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${STEP_META[step].color}`}>
              {STEP_META[step].icon}
            </div>
            <div>
              <h2 className="font-semibold text-sm">
                {step === 1 ? t('onboarding.step1Title') : step === 2 ? t('onboarding.step2Title') : t('onboarding.step3Title')}
              </h2>
              <p className="text-xs text-base-content/40">
                {step === 1 ? t('onboarding.step1Desc') : step === 2 ? t('onboarding.step2Desc') : t('onboarding.step3Desc')}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* ── STEP 1 ── */}
            {step === 1 && (
              <>
                {error && (
                  <div className="flex items-center gap-2 text-error text-sm bg-error/8 border border-error/20 rounded-xl px-3 py-2.5">
                    <RiAlertLine size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleAnalyze} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-base-content/50 mb-1.5 block">
                      Uzum URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                      className="input input-bordered w-full"
                      placeholder={t('onboarding.urlPlaceholder')}
                    />
                    <p className="text-xs text-base-content/30 mt-1.5">
                      Masalan: uzum.uz/ru/product/smartfon-samsung/...
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full"
                  >
                    {loading
                      ? <><span className="loading loading-spinner loading-sm" /> {t('analyze.analyzing')}</>
                      : <><RiSearchLine size={16} /> {t('onboarding.analyze')}</>
                    }
                  </button>
                </form>

                {result && (
                  <div className="rounded-xl border border-base-300/50 overflow-hidden">
                    <div className="flex items-start gap-3 p-3 bg-base-200/40">
                      {result.photo_url && (
                        <img
                          src={result.photo_url}
                          alt={result.title}
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm line-clamp-2">{result.title}</p>
                        <p className="text-xs text-base-content/50 mt-0.5">{formatPrice(result.sell_price)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-px bg-base-300/30">
                      <div className="bg-base-100 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-primary">
                          <RiStarLine size={12} />
                          <span className="font-bold text-sm">{result.score.toFixed(1)}</span>
                        </div>
                        <p className="text-[10px] text-base-content/40 mt-0.5 uppercase tracking-wider">Score</p>
                      </div>
                      <div className="bg-base-100 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <RiShoppingCart2Line size={12} className="text-base-content/40" />
                          <span className="font-bold text-sm">{result.orders_quantity?.toLocaleString() ?? '-'}</span>
                        </div>
                        <p className="text-[10px] text-base-content/40 mt-0.5 uppercase tracking-wider">{t('analyze.totalOrders')}</p>
                      </div>
                      <div className="bg-base-100 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <RiPulseLine size={12} className="text-base-content/40" />
                          <span className="font-bold text-sm">{result.weekly_bought?.toLocaleString() ?? '-'}</span>
                        </div>
                        <p className="text-[10px] text-base-content/40 mt-0.5 uppercase tracking-wider">{t('analyze.recentActivity')}</p>
                      </div>
                    </div>

                    <div className="p-3">
                      <button
                        onClick={() => setStep(2)}
                        className="btn btn-primary btn-sm w-full"
                      >
                        {t('onboarding.next')} <RiArrowRightLine size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <>
                {result && (
                  <div className="flex items-center gap-3 p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                    {result.photo_url && (
                      <img
                        src={result.photo_url}
                        alt={result.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{result.title}</p>
                      <p className="text-xs text-base-content/40 mt-0.5">
                        Score: <span className="text-primary font-bold">{result.score.toFixed(1)}</span>
                        <span className="mx-1 text-base-content/20">·</span>
                        {formatPrice(result.sell_price)}
                      </p>
                    </div>
                  </div>
                )}

                {tracked ? (
                  <div className="flex items-center gap-3 bg-success/10 border border-success/30 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success shrink-0">
                      <RiCheckLine size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-success">{t('analyze.tracked')}</p>
                      <p className="text-xs text-base-content/40">Har hafta yangilanadi</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleTrack}
                    disabled={trackLoading}
                    className="btn btn-secondary w-full"
                  >
                    {trackLoading
                      ? <span className="loading loading-spinner loading-sm" />
                      : <RiBookmarkLine size={16} />
                    }
                    {t('onboarding.track')}
                  </button>
                )}

                <button
                  onClick={() => setStep(3)}
                  className="btn btn-ghost w-full text-sm text-base-content/50"
                >
                  {tracked ? t('onboarding.next') : t('onboarding.skip')}
                  <RiArrowRightLine size={14} />
                </button>
              </>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <>
                <div className="text-center space-y-4 py-2">
                  <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center mx-auto">
                    <RiTelegramLine size={32} className="text-info" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">@VentraBot</p>
                    <p className="text-sm text-base-content/50 mt-1">{t('onboarding.step3Desc')}</p>
                  </div>
                  <a
                    href="https://t.me/VentraBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-info w-full"
                  >
                    <RiTelegramLine size={16} />
                    t.me/VentraBot
                    <RiExternalLinkLine size={13} className="opacity-60" />
                  </a>
                </div>

                <button
                  onClick={handleFinish}
                  className="btn btn-primary w-full"
                >
                  {t('onboarding.finish')}
                </button>

                <button
                  onClick={handleFinish}
                  className="btn btn-ghost w-full text-sm text-base-content/40"
                >
                  {t('onboarding.later')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
