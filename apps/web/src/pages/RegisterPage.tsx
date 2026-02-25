import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') ?? '';
  const [form, setForm] = useState({ email: '', password: '', company_name: '', referral_code: refCode });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(form.email, form.password, form.company_name, form.referral_code || undefined);
      localStorage.setItem('access_token', res.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Ro'yxatdan o'tish xatosi");
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
            <h2 className="text-xl font-bold">Bepul boshlang!</h2>
            <p className="text-base-content/60 text-sm leading-relaxed">
              Uzum marketplace'da mahsulotlarni tahlil qiling, trendlarni aniqlang va raqobatchilarga
              nisbatan ustunlik qo'lga kiriting.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Real-time narx va sotuv monitoring',
              'AI asosida trend bashorat qilish',
              'Xitoy / Yevropa narx taqqoslash',
              'Discovery — kategoriya skanerlash',
              'Profit kalkulyator va ROI hisoblash',
            ].map((item) => (
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
            <p className="text-base-content/40 text-sm">Yangi hisob yaratish</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl bg-base-100 border border-base-300 shadow-xl p-6 lg:p-8">
            <div className="hidden lg:block mb-6">
              <h2 className="text-xl font-bold">Ro'yxatdan o'tish</h2>
              <p className="text-base-content/50 text-sm mt-1">Yangi hisob yarating va boshlang</p>
            </div>
            <div className="lg:hidden text-center mb-4">
              <h2 className="text-lg font-bold">Yangi hisob yarating</h2>
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
                <legend className="fieldset-legend text-xs">Kompaniya nomi</legend>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  required
                  minLength={2}
                  className="input input-bordered w-full"
                  placeholder="Mening do'konim"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Email</legend>
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
                <legend className="fieldset-legend text-xs">Parol</legend>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  className="input input-bordered w-full"
                  placeholder="Kamida 8 ta belgi"
                  autoComplete="new-password"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Referal kod (ixtiyoriy)</legend>
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
                {loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish"}
              </button>
            </form>

            <div className="divider text-xs text-base-content/30 my-4">yoki</div>

            <p className="text-center text-sm">
              Akkaunt bormi?{' '}
              <Link to="/login" className="link link-primary font-medium">
                Kirish
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
