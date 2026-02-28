import { Outlet, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { queryClient } from '../stores/queryClient';
import { useAuthStore } from '../stores/authStore';
import {
  HomeIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  WalletIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
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
import { logError } from '../utils/handleError';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../hooks/useTheme';
import type { Lang } from '../i18n/translations';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'uz', label: "O'z" },
  { code: 'ru', label: 'Ру' },
  { code: 'en', label: 'En' },
];

/* ── Sidebar nav section ── */
interface NavSection {
  label: string;
  badge?: string;
  items: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; badge?: number; end?: boolean }[];
}

/* ── Chevron icon ── */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-base-content/25 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ── Puzzle icon for Extension ── */
function PuzzleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
    </svg>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const [paymentDue, setPaymentDue] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const { lang, setLang, t } = useI18n();
  const { isDark, toggle } = useTheme();

  const payload = getTokenPayload();
  const isSuperAdmin = payload?.role === 'SUPER_ADMIN';
  const userEmail = payload?.email || 'user@ventra.uz';
  const location = useLocation();
  const [sp] = useSearchParams();

  const adminLinkClass = (tab?: string) => {
    const onAdmin = location.pathname === '/admin';
    const currentTab = sp.get('tab');
    return onAdmin && (tab ? currentTab === tab : !currentTab);
  };

  // Auto-open section based on current path
  useEffect(() => {
    const path = location.pathname;
    const initial: Record<string, boolean> = {};
    if (['/', '/analyze', '/discovery', '/sourcing'].some(p => p === '/' ? path === '/' : path.startsWith(p))) initial['asosiy'] = true;
    if (['/shops', '/signals', '/leaderboard'].some(p => path.startsWith(p))) initial['mahsulot'] = true;
    if (['/calculator', '/elasticity', '/ai-description', '/consultation'].some(p => path.startsWith(p))) initial['asboblar'] = true;
    if (['/enterprise', '/referral', '/api-keys', '/feedback', '/extension'].some(p => path.startsWith(p))) initial['biznes'] = true;
    if (path === '/admin') initial['admin'] = true;
    setOpenSections(prev => ({ ...prev, ...initial }));
  }, [location.pathname]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (isSuperAdmin) return;
    billingApi.getBalance().then((r) => {
      if (r.data.status === 'PAYMENT_DUE') {
        setPaymentDue(true);
        setBalance(r.data.balance);
      }
    }).catch(logError);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setPaymentDue(true);
      if (detail?.balance) setBalance(detail.balance);
    };
    window.addEventListener('payment-due', handler);
    return () => window.removeEventListener('payment-due', handler);
  }, []);

  useEffect(() => {
    notificationApi.getMy().then((r) => {
      const unread = (r.data || []).filter((n: { is_read: boolean }) => !n.is_read).length;
      setUnreadCount(unread);
    }).catch(logError);
  }, []);

  const clearTokens = useAuthStore((s) => s.clearTokens);

  function logout() {
    const rt = localStorage.getItem('refresh_token');
    if (rt) {
      import('../api/client').then(({ authApi }) =>
        authApi.logout(rt).catch(logError),
      );
    }
    // Clear all cached API data so next login starts fresh
    queryClient.clear();
    clearTokens();
    navigate('/login');
  }

  // ── Build nav sections ──
  const sections: NavSection[] = [];

  if (isSuperAdmin) {
    sections.push({
      label: t('nav.admin'),
      badge: 'ADMIN',
      items: [
        { to: '/admin', icon: ShieldCheckIcon, label: t('nav.dashboard'), end: true },
        { to: '/admin?tab=accounts', icon: BuildingOffice2Icon, label: t('nav.admin.accounts') },
        { to: '/admin?tab=analytics', icon: ChartBarIcon, label: t('nav.admin.analytics') },
        { to: '/admin?tab=system', icon: ServerStackIcon, label: t('nav.admin.system') },
        { to: '/admin?tab=feedback', icon: ChatBubbleBottomCenterTextIcon, label: t('nav.admin.feedback') },
        { to: '/admin?tab=notifications', icon: BellIcon, label: t('nav.admin.notifications') },
        { to: '/admin?tab=audit', icon: DocumentTextIcon, label: t('nav.admin.audit') },
        { to: '/admin?tab=deposits', icon: BanknotesIcon, label: t('nav.admin.deposits') },
      ],
    });
  }

  sections.push(
    {
      label: t('nav.section.main'),
      items: [
        { to: '/', icon: HomeIcon, label: t('nav.dashboard'), end: true },
        { to: '/analyze', icon: MagnifyingGlassIcon, label: t('nav.analyze') },
        { to: '/discovery', icon: ArrowTrendingUpIcon, label: t('nav.discovery') },
        { to: '/sourcing', icon: GlobeAltIcon, label: t('nav.sourcing') },
      ],
    },
    {
      label: t('nav.section.product'),
      items: [
        { to: '/shops', icon: StorefrontIcon, label: t('nav.shops') },
        { to: '/signals', icon: SignalIcon, label: t('nav.signals') },
        { to: '/leaderboard', icon: TrophyIcon, label: t('nav.leaderboard') },
      ],
    },
    {
      label: t('nav.tools'),
      items: [
        { to: '/calculator', icon: CalculatorIcon, label: t('nav.calculator') },
        { to: '/elasticity', icon: ScaleIcon, label: t('nav.elasticity') },
        { to: '/ai-description', icon: SparklesIcon, label: t('nav.description') },
        { to: '/consultation', icon: ChatBubbleLeftRightIcon, label: t('nav.consultation') },
      ],
    },
    {
      label: t('nav.section.business'),
      items: [
        { to: '/enterprise', icon: BuildingOfficeIcon, label: t('nav.enterprise') },
        { to: '/referral', icon: UserGroupIcon, label: t('nav.referral') },
        { to: '/api-keys', icon: KeyIcon, label: t('nav.apiKeys') },
        { to: '/extension', icon: PuzzleIcon, label: t('nav.extension') },
        { to: '/feedback', icon: ChatBubbleBottomCenterTextIcon, label: t('nav.feedback'), badge: unreadCount },
      ],
    },
  );

  const sectionKeys = isSuperAdmin
    ? ['admin', 'asosiy', 'mahsulot', 'asboblar', 'biznes']
    : ['asosiy', 'mahsulot', 'asboblar', 'biznes'];

  function isItemActive(item: { to: string; end?: boolean }) {
    if (item.to.includes('?tab=')) {
      const tab = item.to.split('tab=')[1];
      return adminLinkClass(tab);
    }
    // /admin without tab — active only when no tab query param is selected
    if (item.to === '/admin' && item.end) {
      return adminLinkClass();
    }
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  }

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
                <strong>{t('payment.due')}</strong> {t('payment.balance')}: {Number(balance).toLocaleString()} {t('common.som')}.
              </span>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 ventra-main-bg relative">
          <Outlet />
          {paymentDue && !['/', '/admin'].includes(location.pathname) && (
            <div className="absolute inset-0 bg-base-100/80 backdrop-blur-sm z-30 flex items-center justify-center">
              <div className="card bg-base-200 shadow-xl border border-error/30 max-w-md mx-4">
                <div className="card-body items-center text-center gap-4">
                  <WalletIcon className="w-12 h-12 text-error" />
                  <h3 className="text-lg font-bold">{t('payment.overdue')}</h3>
                  <p className="text-base-content/60 text-sm"
                    dangerouslySetInnerHTML={{ __html: t('payment.overdueDesc').replace('{balance}', `<strong>${Number(balance).toLocaleString()} ${t('common.som')}</strong>`) }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
                    {t('payment.goHome')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═══ SIDEBAR ═══ */}
      <div className="drawer-side z-40">
        <label htmlFor="drawer" className="drawer-overlay" />
        <aside className="ventra-sidebar w-[272px] h-screen sticky top-0 flex flex-col border-r border-base-300/60 overflow-hidden">

          {/* ── Logo ── */}
          <div className="px-5 py-4 border-b border-base-300/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20">
                <span className="text-primary-content font-bold text-sm font-heading">V</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-[15px] leading-none tracking-tight">VENTRA</p>
                <p className="text-[11px] text-base-content/35 mt-0.5">{t('layout.tagline')}</p>
              </div>
            </div>
          </div>

          {/* ── Navigation ── */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 sidebar-scroll">
            {sections.map((section, si) => {
              const key = sectionKeys[si];
              const isOpen = openSections[key] ?? false;
              const isAdmin = key === 'admin';

              return (
                <div key={key}>
                  {/* Section divider (not for first) */}
                  {si > 0 && !isAdmin && <div className="h-px bg-base-300/30 mx-2 my-2" />}
                  {isAdmin && si > 0 && <div className="h-px bg-error/15 mx-2 my-2" />}

                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] uppercase tracking-[0.08em] font-bold transition-colors ${
                      isAdmin
                        ? 'text-error/60 hover:bg-error/5'
                        : 'text-base-content/35 hover:bg-base-content/3'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {section.label}
                      {section.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-error/10 text-error/70 font-bold normal-case tracking-normal">
                          {section.badge}
                        </span>
                      )}
                    </span>
                    <ChevronIcon open={isOpen} />
                  </button>

                  {/* Section items */}
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-out ${
                      isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="space-y-0.5 pt-1 pb-0.5">
                      {section.items.map((item) => {
                        const active = isItemActive(item);
                        const Icon = item.icon;

                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                              active
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-base-content/65 hover:bg-base-content/5 hover:text-base-content/85 font-medium'
                            }`}
                          >
                            {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />}
                            <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-primary' : 'text-base-content/40 group-hover:text-base-content/55'}`} />
                            <span className="truncate">{item.label}</span>
                            {item.badge != null && item.badge > 0 && (
                              <span className="ml-auto text-[10px] font-bold bg-error/15 text-error px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          {/* ── Footer ── */}
          <div className="border-t border-base-300/40 p-3 space-y-3">
            {/* Theme + Language */}
            <div className="flex items-center gap-1 px-1">
              <button
                onClick={toggle}
                className="btn btn-ghost btn-xs btn-square rounded-lg tooltip tooltip-top"
                data-tip={isDark ? t('layout.lightMode') : t('layout.darkMode')}
              >
                {isDark ? <SunIcon className="w-3.5 h-3.5" /> : <MoonIcon className="w-3.5 h-3.5" />}
              </button>
              <div className="w-px h-4 bg-base-300/40 mx-1" />
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`btn btn-xs rounded-lg ${lang === l.code ? 'btn-primary' : 'btn-ghost text-base-content/40'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* User + Logout */}
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-base-content/3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-xs font-heading">
                  {isSuperAdmin ? 'SA' : userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{isSuperAdmin ? 'Super Admin' : userEmail.split('@')[0]}</p>
                <p className="text-[10px] text-base-content/30 truncate">
                  {isSuperAdmin ? 'admin@ventra' : t('layout.proPlan')}
                </p>
              </div>
              <button
                onClick={logout}
                className="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/30 hover:text-error tooltip tooltip-top"
                data-tip={t('nav.logout')}
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
