import { Outlet, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  HomeIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  WalletIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  FireIcon,
  ShieldCheckIcon,
  UsersIcon,
  BuildingOffice2Icon,
  ServerStackIcon,
  ChatBubbleBottomCenterTextIcon,
  BellIcon,
  DocumentTextIcon,
  BanknotesIcon,
  StorefrontIcon,
  SignalIcon,
  TrophyIcon,
  CalculatorIcon,
  ScaleIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  KeyIcon,
  SunIcon,
  MoonIcon,
} from './icons';
import { getTokenPayload, billingApi, notificationApi } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../hooks/useTheme';
import type { Lang } from '../i18n/translations';

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
  const { isDark, toggle } = useTheme();

  const payload = getTokenPayload();
  const isSuperAdmin = payload?.role === 'SUPER_ADMIN';
  const location = useLocation();
  const [sp] = useSearchParams();

  const adminLinkClass = (tab?: string) => {
    const onAdmin = location.pathname === '/admin';
    const currentTab = sp.get('tab');
    const isActive = onAdmin && (tab ? currentTab === tab : !currentTab);
    return isActive ? 'active bg-primary/10 text-primary font-semibold' : 'hover:bg-base-content/5 text-base-content/75 font-medium';
  };

  useEffect(() => {
    if (isSuperAdmin) return;
    billingApi.getBalance().then((r) => {
      if (r.data.status === 'PAYMENT_DUE') {
        setPaymentDue(true);
        setBalance(r.data.balance);
      }
    }).catch(() => {});
  }, []);

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
    `${isActive ? 'active bg-primary/10 text-primary font-semibold' : 'hover:bg-base-content/5 text-base-content/75 font-medium'}`;

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col">
        {/* Mobile navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 lg:hidden">
          <label htmlFor="drawer" className="btn btn-ghost drawer-button">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
          <span className="font-heading font-bold text-lg ml-2 tracking-tight">VENTRA</span>
          <div className="flex-1" />
          <button onClick={toggle} className="btn btn-ghost btn-sm btn-square">
            {isDark ? <SunIcon className="w-4.5 h-4.5" /> : <MoonIcon className="w-4.5 h-4.5" />}
          </button>
          <NavLink to="/feedback" className="btn btn-ghost btn-sm relative">
            <BellIcon className="w-5 h-5" />
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

        <main className="flex-1 p-4 lg:p-6 ventra-main-bg">
          <Outlet />
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-40">
        <label htmlFor="drawer" className="drawer-overlay" />
        <aside className="ventra-sidebar w-56 min-h-full flex flex-col border-r border-base-300">
          {/* Logo */}
          <div className="p-4 border-b border-base-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center">
                <span className="text-primary-content font-bold text-sm font-heading">V</span>
              </div>
              <div>
                <p className="font-heading font-bold text-sm leading-none tracking-tight">VENTRA</p>
                <p className="text-[11px] text-base-content/40 mt-0.5">Analytics Platform</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <ul className="menu menu-sm flex-1 p-3 gap-0.5 overflow-y-auto">
            {/* === ADMIN PANEL (TOP) === */}
            {isSuperAdmin && (
              <>
                <li className="menu-title mt-1">
                  <span className="text-error/70 text-[10px] uppercase tracking-wider font-bold">Admin Panel</span>
                </li>
                <li><NavLink to="/admin" end className={() => adminLinkClass()}>
                  <ShieldCheckIcon className="w-4 h-4" /> Dashboard
                </NavLink></li>
                <li><NavLink to="/admin?tab=accounts" className={() => adminLinkClass('accounts')}>
                  <BuildingOffice2Icon className="w-4 h-4" />
                  Akkauntlar & Userlar
                </NavLink></li>
                <li><NavLink to="/admin?tab=analytics" className={() => adminLinkClass('analytics')}>
                  <ChartBarIcon className="w-4 h-4" />
                  Analitika & Mashhur
                </NavLink></li>
                <li><NavLink to="/admin?tab=system" className={() => adminLinkClass('system')}>
                  <ServerStackIcon className="w-4 h-4" />
                  Tizim
                </NavLink></li>
                <li><NavLink to="/admin?tab=feedback" className={() => adminLinkClass('feedback')}>
                  <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                  Feedback
                </NavLink></li>
                <li><NavLink to="/admin?tab=notifications" className={() => adminLinkClass('notifications')}>
                  <BellIcon className="w-4 h-4" />
                  Xabarnomalar
                </NavLink></li>
                <li><NavLink to="/admin?tab=audit" className={() => adminLinkClass('audit')}>
                  <DocumentTextIcon className="w-4 h-4" />
                  Audit Log
                </NavLink></li>
                <li><NavLink to="/admin?tab=deposits" className={() => adminLinkClass('deposits')}>
                  <BanknotesIcon className="w-4 h-4" />
                  Deposit Log
                </NavLink></li>

                <div className="divider my-1 h-0" />
              </>
            )}

            {/* === ASOSIY === */}
            <li className="menu-title mt-1">
              <span className="text-base-content/50 text-[10px] uppercase tracking-wider font-bold">Asosiy</span>
            </li>
            <li>
              <NavLink to="/" end className={linkClass}>
                <HomeIcon className="w-4 h-4" />
                {isSuperAdmin ? 'Home' : t('nav.dashboard')}
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
              <span className="text-base-content/50 text-[10px] uppercase tracking-wider font-bold">Mahsulot</span>
            </li>
            <li>
              <NavLink to="/shops" className={linkClass}>
                <StorefrontIcon className="w-4 h-4" />
                {t('nav.shops')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/signals" className={linkClass}>
                <SignalIcon className="w-4 h-4" />
                {t('nav.signals')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/leaderboard" className={linkClass}>
                <TrophyIcon className="w-4 h-4" />
                {t('nav.leaderboard')}
              </NavLink>
            </li>

            {/* === ASBOBLAR === */}
            <li className="menu-title mt-3">
              <span className="text-base-content/50 text-[10px] uppercase tracking-wider font-bold">{t('nav.tools')}</span>
            </li>
            <li>
              <NavLink to="/calculator" className={linkClass}>
                <CalculatorIcon className="w-4 h-4" />
                {t('nav.calculator')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/elasticity" className={linkClass}>
                <ScaleIcon className="w-4 h-4" />
                {t('nav.elasticity')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/ai-description" className={linkClass}>
                <SparklesIcon className="w-4 h-4" />
                {t('nav.description')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/consultation" className={linkClass}>
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                {t('nav.consultation')}
              </NavLink>
            </li>

            {/* === BIZNES === */}
            <li className="menu-title mt-3">
              <span className="text-base-content/50 text-[10px] uppercase tracking-wider font-bold">Biznes</span>
            </li>
            <li>
              <NavLink to="/enterprise" className={linkClass}>
                <BuildingOfficeIcon className="w-4 h-4" />
                {t('nav.enterprise')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/referral" className={linkClass}>
                <UserGroupIcon className="w-4 h-4" />
                {t('nav.referral')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/api-keys" className={linkClass}>
                <KeyIcon className="w-4 h-4" />
                {t('nav.apiKeys')}
              </NavLink>
            </li>
            <li>
              <NavLink to="/feedback" className={linkClass}>
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                Feedback
                {unreadCount > 0 && (
                  <span className="badge badge-error badge-xs ml-auto">{unreadCount}</span>
                )}
              </NavLink>
            </li>

          </ul>

          {/* Theme + Language + Logout */}
          <div className="p-3 border-t border-base-300 space-y-2">
            {/* Theme toggle + Language */}
            <div className="flex items-center gap-1 justify-center">
              <button
                onClick={toggle}
                className="btn btn-ghost btn-xs btn-square tooltip tooltip-top"
                data-tip={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <SunIcon className="w-3.5 h-3.5" /> : <MoonIcon className="w-3.5 h-3.5" />}
              </button>
              <div className="w-px h-4 bg-base-300 mx-1" />
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
