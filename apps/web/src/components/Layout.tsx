import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  WalletIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
} from './icons';
import { getTokenPayload, billingApi } from '../api/client';

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const [paymentDue, setPaymentDue] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  const payload = getTokenPayload();
  const isSuperAdmin = payload?.role === 'SUPER_ADMIN';

  useEffect(() => {
    billingApi.getBalance().then((r) => {
      if (r.data.status === 'PAYMENT_DUE') {
        setPaymentDue(true);
        setBalance(r.data.balance);
      }
    }).catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem('access_token');
    navigate('/login');
  }

  return (
    <div className="drawer lg:drawer-open min-h-screen" data-theme="night">
      <input id="drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col">
        {/* Mobile navbar */}
        <div className="navbar bg-base-200 lg:hidden">
          <label htmlFor="drawer" className="btn btn-ghost drawer-button">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
          <span className="font-bold text-lg ml-2">Uzum Trend</span>
        </div>

        {/* PAYMENT_DUE global banner */}
        {paymentDue && (
          <div className="bg-error/10 border-b border-error/30 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-error text-sm">
              <WalletIcon className="w-4 h-4 shrink-0" />
              <span>
                <strong>To'lov kerak!</strong> Balans: {Number(balance).toLocaleString()} so'm.
                Xizmatdan foydalanish uchun balansni to'ldiring.
              </span>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 bg-base-100">
          <Outlet />
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-40">
        <label htmlFor="drawer" className="drawer-overlay" />
        <aside className="bg-base-200 w-56 min-h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-base-300">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-content font-bold text-sm">U</span>
              </div>
              <div>
                <p className="font-bold text-sm leading-none">Uzum Trend</p>
                <p className="text-xs text-base-content/50 mt-0.5">Analytics SaaS</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <ul className="menu menu-sm flex-1 p-3 gap-1">
            <li>
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                <ChartBarIcon className="w-4 h-4" />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/analyze" className={({ isActive }) => isActive ? 'active' : ''}>
                <MagnifyingGlassIcon className="w-4 h-4" />
                URL Analyze
              </NavLink>
            </li>
            <li>
              <NavLink to="/discovery" className={({ isActive }) => isActive ? 'active' : ''}>
                <ArrowTrendingUpIcon className="w-4 h-4" />
                Discovery
              </NavLink>
            </li>
            <li>
              <NavLink to="/sourcing" className={({ isActive }) => isActive ? 'active' : ''}>
                <GlobeAltIcon className="w-4 h-4" />
                Sourcing
              </NavLink>
            </li>

            <li>
              <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                </svg>
                Leaderboard
              </NavLink>
            </li>

            <li className="menu-title mt-2">
              <span>Asboblar</span>
            </li>
            <li>
              <NavLink to="/tools/profit-calculator" className={({ isActive }) => isActive ? 'active' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
                </svg>
                Foyda Kalk.
              </NavLink>
            </li>

            {/* Admin link — only for SUPER_ADMIN */}
            {isSuperAdmin && (
              <>
                <li className="menu-title mt-3">
                  <span>Admin</span>
                </li>
                <li>
                  <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
                    <ShieldIcon className="w-4 h-4" />
                    Admin Panel
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          {/* Logout */}
          <div className="p-3 border-t border-base-300">
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm w-full justify-start gap-2"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              Chiqish
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
