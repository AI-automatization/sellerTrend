import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { queryClient } from '../stores/queryClient';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useI18n } from '../i18n/I18nContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') ?? '';
  const [form, setForm] = useState({ email: '', password: '', company_name: '', referral_code: refCode });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const features = [
    t('auth.regFeature1'),
    t('auth.regFeature2'),
    t('auth.regFeature3'),
    t('auth.regFeature4'),
    t('auth.regFeature5'),
  ];

  const setTokens = useAuthStore((s) => s.setTokens);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(form.email, form.password, form.company_name, form.referral_code || undefined);
      queryClient.clear();
      setTokens(res.data.access_token, res.data.refresh_token ?? '');
      navigate('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('auth.registerError')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-base-200 items-center justify-center p-12">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-primary/3 blur-3xl" />

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
            <h2 className="text-xl font-bold">{t('auth.freeStart')}</h2>
            <p className="text-base-content/60 text-sm leading-relaxed">
              {t('auth.registerDesc')}
            </p>
          </div>

          <div className="space-y-3">
            {features.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-success/15 text-success flex items-center justify-center text-xs shrink-0">✓</span>
                <span className="text-base-content/70">{item}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-base-content/25">
            VENTRA v5.1 — 43+ funksiya
          </p>
        </div>
      </div>

      {/* Right — register form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-base-200">
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-secondary/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex flex-col items-center lg:hidden mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
              <span className="text-primary-content font-black text-2xl font-heading">V</span>
            </div>
            <h1 className="text-2xl font-black font-heading tracking-tight">VENTRA</h1>
            <p className="text-base-content/40 text-sm">{t('auth.createAccount')}</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl bg-base-100 border border-base-300 shadow-xl p-6 lg:p-8">
            <div className="hidden lg:block mb-6">
              <h2 className="text-xl font-bold">{t('auth.registerTitle')}</h2>
              <p className="text-base-content/50 text-sm mt-1">{t('auth.registerSubtitle')}</p>
            </div>
            <div className="lg:hidden text-center mb-4">
              <h2 className="text-lg font-bold">{t('auth.createAccount')}</h2>
            </div>

            {error && (
              <div role="alert" className="alert alert-error alert-soft py-2 text-sm mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">{t('auth.companyName')}</legend>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  required
                  minLength={2}
                  className="input input-bordered w-full"
                  placeholder={t('auth.companyPlaceholder')}
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">{t('auth.email')}</legend>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="input input-bordered w-full"
                  placeholder="email@example.com"
                  autoComplete="email"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">{t('auth.password')}</legend>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  className="input input-bordered w-full"
                  placeholder={t('auth.minChars')}
                  autoComplete="new-password"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">{t('auth.referralCode')}</legend>
                <input
                  type="text"
                  value={form.referral_code}
                  onChange={(e) => setForm({ ...form, referral_code: e.target.value })}
                  className="input input-bordered w-full"
                  placeholder="abcd1234"
                  maxLength={20}
                />
              </fieldset>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-2 shadow-lg shadow-primary/20"
              >
                {loading && <span className="loading loading-spinner loading-sm" />}
                {loading ? t('auth.creating') : t('auth.register')}
              </button>
            </form>

            <div className="divider text-xs text-base-content/30 my-4">{t('common.or')}</div>

            <p className="text-center text-sm">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="link link-primary font-medium">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
