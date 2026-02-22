import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  WalletIcon,
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
