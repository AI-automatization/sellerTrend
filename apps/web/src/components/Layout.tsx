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
import { getTokenPayload, billingApi, notificationApi } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import type { Lang } from '../i18n/translations';

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

const LANGS: { code: Lang; label: string }[] = [
  { code: 'uz', label: "O'z" },
  { code: 'ru', label: 'Ру' },
  { code: 'en', label: 'En' },
];

export function Layout() {
  const navigate = useNavigate();
  const [paymentDue, setPaymentDue] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { lang, setLang, t } = useI18n();

  const payload = getTokenPayload();
  const isSuperAdmin = payload?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isSuperAdmin) return;
    billingApi.getBalance().then((r) => {
      if (r.data.status === 'PAYMENT_DUE') {
        setPaymentDue(true);
        setBalance(r.data.balance);
      }
    }).catch(() => {});
  }, []);

  // Fetch unread notifications
  useEffect(() => {
    notificationApi.getMy().then((r) => {
      const unread = (r.data || []).filter((n: any) => !n.is_read).length;
      setUnreadCount(unread);
    }).catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem('access_token');
    navigate('/login');
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${isActive ? 'active bg-primary/10 text-primary' : 'hover:bg-base-300/50'}`;

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
          {/* Notification bell mobile */}
          <div className="flex-1" />
          <NavLink to="/feedback" className="btn btn-ghost btn-sm relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="badge badge-error badge-xs absolute -top-1 -right-1">{unreadCount}</span>
            )}
          </NavLink>
        </div>

        {/* PAYMENT_DUE global banner */}
        {paymentDue && (
          <div className="bg-error/10 border-b border-error/30 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-error text-sm">
              <WalletIcon className="w-4 h-4 shrink-0" />
              <span>
                <strong>{t('payment.due')}</strong> {t('payment.balance')}: {Number(balance).toLocaleString()} so'm.
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
          <ul className="menu menu-sm flex-1 p-3 gap-0.5 overflow-y-auto text-[13px]">
            {/* === ASOSIY === */}
            <li className="menu-title mt-1">
              <span className="text-base-content/40 text-[10px] uppercase tracking-wider">Asosiy</span>
            </li>
            <li>
              <NavLink to="/" end className={linkClass}>
                <ChartBarIcon className="w-4 h-4" />
                {t('nav.dashboard')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/analyze" className={linkClass}>
                <MagnifyingGlassIcon className="w-4 h-4" />
                {t('nav.analyze')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/discovery" className={linkClass}>
                <ArrowTrendingUpIcon className="w-4 h-4" />
                {t('nav.discovery')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/sourcing" className={linkClass}>
                <GlobeAltIcon className="w-4 h-4" />
                {t('nav.sourcing')}
              </NavLink>
            </li>

            {/* === MAHSULOT === */}
            <li className="menu-title mt-3">
              <span className="text-base-content/40 text-[10px] uppercase tracking-wider">Mahsulot</span>
            </li>
            <li>
              <NavLink to="/shops" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
                </svg>
                {t('nav.shops')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/signals" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {t('nav.signals')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/leaderboard" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-3.52 1.142 6.003 6.003 0 01-3.52-1.142" />
                </svg>
                {t('nav.leaderboard')}
              </NavLink>
            </li>

            {/* === ASBOBLAR === */}
            <li className="menu-title mt-3">
              <span className="text-base-content/40 text-[10px] uppercase tracking-wider">{t('nav.tools')}</span>
            </li>
            <li>
              <NavLink to="/calculator" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75V18m15-8.25l-8.25 4.5m0 0l-8.25-4.5M21 9.75v4.5m0 0l-8.25 4.5m0 0l-8.25-4.5" />
                </svg>
                {t('nav.calculator')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/elasticity" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                </svg>
                {t('nav.elasticity')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/ai-description" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {t('nav.description')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/consultation" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
                {t('nav.consultation')}
              </NavLink>
            </li>

            {/* === BIZNES === */}
            <li className="menu-title mt-3">
              <span className="text-base-content/40 text-[10px] uppercase tracking-wider">Biznes</span>
            </li>
            <li>
              <NavLink to="/enterprise" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                {t('nav.enterprise')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/referral" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                {t('nav.referral')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/api-keys" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                {t('nav.apiKeys')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/feedback" className={linkClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                Feedback
                {unreadCount > 0 && (
                  <span className="badge badge-error badge-xs ml-auto">{unreadCount}</span>
                )}
              </NavLink>
            </li>

            {/* === ADMIN === */}
            {isSuperAdmin && (
              <>
                <li className="menu-title mt-3">
                  <span className="text-base-content/40 text-[10px] uppercase tracking-wider">Admin</span>
                </li>
                <li>
                  <NavLink to="/admin" className={linkClass}>
                    <ShieldIcon className="w-4 h-4" />
                    {t('nav.admin')}
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          {/* Language switcher + Logout */}
          <div className="p-3 border-t border-base-300 space-y-2">
            <div className="flex gap-1 justify-center">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`btn btn-xs ${lang === l.code ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm w-full justify-start gap-2"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              {t('nav.logout')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
