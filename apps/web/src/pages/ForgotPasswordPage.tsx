import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useI18n } from '../i18n/I18nContext';

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-base-200 items-center justify-center p-12">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-primary/3 blur-3xl" />

        <div className="relative z-10 max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-primary-content font-black text-2xl font-heading">V</span>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight font-heading">VENTRA</h1>
              <p className="text-base-content/40 text-sm">Analytics Platform</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t('auth.forgotPasswordTitle')}</h2>
            <p className="text-base-content/60 text-sm leading-relaxed">
              {t('auth.enterYourEmail')}
            </p>
          </div>

          <p className="text-xs text-base-content/25">
            VENTRA v5.6 — Premium Analytics
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-base-200">
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-secondary/5 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex flex-col items-center lg:hidden mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
              <span className="text-primary-content font-black text-2xl font-heading">V</span>
            </div>
            <h1 className="text-2xl font-black font-heading tracking-tight">VENTRA</h1>
            <p className="text-base-content/40 text-sm">Analytics Platform</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl bg-base-100 border border-base-300 shadow-xl p-6 lg:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold">{t('auth.forgotPasswordTitle')}</h2>
              <p className="text-base-content/50 text-sm mt-1">{t('auth.enterYourEmail')}</p>
            </div>

            {sent ? (
              <div className="space-y-4">
                <div role="alert" className="alert alert-success alert-soft py-3 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('auth.resetLinkSent')}</span>
                </div>
                <Link to="/login" className="btn btn-ghost w-full">
                  {t('auth.backToLogin')}
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div role="alert" className="alert alert-error alert-soft py-2 text-sm mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend text-xs">{t('auth.email')}</legend>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="input input-bordered w-full"
                      placeholder="email@example.com"
                      autoComplete="email"
                    />
                  </fieldset>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full mt-2 shadow-lg shadow-primary/20"
                  >
                    {loading && <span className="loading loading-spinner loading-sm" />}
                    {loading ? t('common.loading') : t('auth.sendResetLink')}
                  </button>
                </form>

                <div className="divider text-xs text-base-content/30 my-4">{t('common.or')}</div>

                <p className="text-center text-sm">
                  <Link to="/login" className="link link-primary font-medium">
                    {t('auth.backToLogin')}
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
