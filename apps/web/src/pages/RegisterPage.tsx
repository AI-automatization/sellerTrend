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
    <div className="min-h-screen flex items-center justify-center bg-base-200" data-theme="night">
      <div className="card w-full max-w-sm shadow-2xl bg-base-100">
        <div className="card-body">
          {/* Logo */}
          <div className="flex flex-col items-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-3">
              <span className="text-primary-content font-black text-xl">U</span>
            </div>
            <h1 className="text-2xl font-bold">Uzum Trend</h1>
            <p className="text-base-content/50 text-sm">Yangi hisob yaratish</p>
          </div>

          {error && (
            <div role="alert" className="alert alert-error alert-soft py-2 text-sm">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
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
              className="btn btn-primary w-full mt-2"
            >
              {loading && <span className="loading loading-spinner loading-sm" />}
              {loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish"}
            </button>
          </form>

          <div className="divider text-xs text-base-content/40">yoki</div>

          <p className="text-center text-sm">
            Akkaunt bormi?{' '}
            <Link to="/login" className="link link-primary">
              Kirish
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
