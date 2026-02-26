import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useI18n } from '../i18n/I18nContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const features = [
    { title: t('auth.featureRealtime'), desc: t('auth.featureRealtimeDesc'), iconPath: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
    { title: t('auth.featureAi'), desc: t('auth.featureAiDesc'), iconPath: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z' },
    { title: t('auth.featureSourcing'), desc: t('auth.featureSourcingDesc'), iconPath: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418' },
    { title: t('auth.featureCount'), desc: t('auth.featureCountDesc'), iconPath: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('access_token', res.data.access_token);
      if (res.data.refresh_token) localStorage.setItem('refresh_token', res.data.refresh_token);
      navigate('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('auth.loginError')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-base-200 items-center justify-center p-12">
        {/* Subtle atmosphere */}
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

          <div className="space-y-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-4 rounded-xl bg-base-200/30 border border-base-300/20 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.iconPath} />
                </svg>
                <div>
                  <p className="font-semibold text-sm">{f.title}</p>
                  <p className="text-xs text-base-content/50 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-base-content/25">
            VENTRA v5.1 — Premium Analytics
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-base-200">
        {/* Mobile decorative bg */}
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
            <div className="hidden lg:block mb-6">
              <h2 className="text-xl font-bold">{t('auth.welcome')}</h2>
              <p className="text-base-content/50 text-sm mt-1">{t('auth.loginSubtitle')}</p>
            </div>
            <div className="lg:hidden text-center mb-4">
              <h2 className="text-lg font-bold">{t('auth.loginSubtitle')}</h2>
            </div>

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

              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">{t('auth.password')}</legend>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input input-bordered w-full"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </fieldset>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-2 shadow-lg shadow-primary/20"
              >
                {loading && <span className="loading loading-spinner loading-sm" />}
                {loading ? t('auth.loggingIn') : t('auth.login')}
              </button>
            </form>

            <div className="divider text-xs text-base-content/30 my-4">{t('common.or')}</div>

            <p className="text-center text-sm">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="link link-primary font-medium">
                {t('auth.register')}
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-base-content/20">
            Demo: demo@ventra.uz / Demo123!
          </p>
        </div>
      </div>
    </div>
  );
}
