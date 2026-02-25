import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('access_token', res.data.access_token);
      if (res.data.refresh_token) localStorage.setItem('refresh_token', res.data.refresh_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Login xatosi');
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
            {[
              { icon: '📊', title: 'Real-time Analitika', desc: 'Uzum mahsulotlarini real vaqtda kuzating' },
              { icon: '🤖', title: 'AI Bashorat', desc: 'ML modellar bilan 7 kunlik trend prognozi' },
              { icon: '🌍', title: 'Global Sourcing', desc: 'Xitoy va Yevropadan narx taqqoslash' },
              { icon: '📈', title: '43+ Funksiya', desc: 'Discovery, Signals, Enterprise va boshqalar' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-4 rounded-xl bg-base-200/30 border border-base-300/20 backdrop-blur-sm">
                <span className="text-2xl shrink-0">{f.icon}</span>
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
              <h2 className="text-xl font-bold">Xush kelibsiz!</h2>
              <p className="text-base-content/50 text-sm mt-1">Hisobingizga kiring</p>
            </div>
            <div className="lg:hidden text-center mb-4">
              <h2 className="text-lg font-bold">Hisobingizga kiring</h2>
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
                <legend className="fieldset-legend text-xs">Email</legend>
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
                <legend className="fieldset-legend text-xs">Parol</legend>
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
                {loading ? 'Kirilmoqda...' : 'Kirish'}
              </button>
            </form>

            <div className="divider text-xs text-base-content/30 my-4">yoki</div>

            <p className="text-center text-sm">
              Akkaunt yo'qmi?{' '}
              <Link to="/register" className="link link-primary font-medium">
                Ro'yxatdan o'tish
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
