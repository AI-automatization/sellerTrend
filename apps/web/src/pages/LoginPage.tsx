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
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Login xatosi');
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
            <p className="text-base-content/50 text-sm">Hisobingizga kiring</p>
          </div>

          {error && (
            <div role="alert" className="alert alert-error alert-soft py-2 text-sm">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <fieldset className="fieldset">
              <legend className="fieldset-legend text-xs">Email</legend>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input input-bordered w-full"
                placeholder="email@example.com"
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
              />
            </fieldset>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2"
            >
              {loading && <span className="loading loading-spinner loading-sm" />}
              {loading ? 'Kirilmoqda...' : 'Kirish'}
            </button>
          </form>

          <div className="divider text-xs text-base-content/40">yoki</div>

          <p className="text-center text-sm">
            Akkaunt yo'qmi?{' '}
            <Link to="/register" className="link link-primary">
              Ro'yxatdan o'tish
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
