import { Outlet, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { BottomNav } from './BottomNav';
import { ScrollToTop } from './ScrollToTop';
import { queryClient } from '../stores/queryClient';
import { useAuthStore } from '../stores/authStore';
import {
  HomeIcon,
  ChartBarIcon,
ArrowRightOnRectangleIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
  ServerStackIcon,
  ChatBubbleBottomCenterTextIcon,
  BellIcon,
  DocumentTextIcon,
  BanknotesIcon,
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
import { getTokenPayload, notificationApi } from '../api/client';
import { logError } from '../utils/handleError';
import { useNotificationRefresh } from '../hooks/useSocket';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../hooks/useTheme';
import type { Lang } from '../i18n/translations';
import { WhatsNew, useHasUnseenUpdates } from './WhatsNew';
import { StreakBadge } from './StreakBadge';
import { ChatWidget } from './chat/ChatWidget';
import { AnalyzeModal } from './AnalyzeModal';
import { SearchDrawer } from './SearchDrawer';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'uz', label: "O'z" },
  { code: 'ru', label: 'Ру' },
  { code: 'en', label: 'En' },
];

/* ── Sidebar nav section ── */
interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  end?: boolean;
  onClick?: () => void;
}

interface NavSection {
  label: string;
  badge?: string;
  items: NavItem[];
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [analyzeUrl, setAnalyzeUrl] = useState<string | undefined>(undefined);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { lang, setLang, t } = useI18n();
  const { isDark, toggle } = useTheme();

  const payload = getTokenPayload();
  const isSuperAdmin = payload?.role === 'SUPER_ADMIN';
  const userEmail = payload?.email || 'user@ventra.uz';
  const location = useLocation();
  const hasUnseenUpdates = useHasUnseenUpdates();
  const [showWhatsNew, setShowWhatsNew] = useState(false);
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
    if (['/', '/discovery'].some(p => p === '/' ? path === '/' : path.startsWith(p))) initial['asosiy'] = true;
    if (['/signals', '/leaderboard'].some(p => path.startsWith(p))) initial['mahsulot'] = true;
    if (['/calculator', '/elasticity', '/ai-description', '/consultation', '/compare'].some(p => path.startsWith(p))) initial['asboblar'] = true;
    if (['/enterprise', '/referral', '/api-keys', '/feedback', '/extension'].some(p => path.startsWith(p))) initial['biznes'] = true;
    if (path === '/admin') initial['admin'] = true;
    setOpenSections(prev => ({ ...prev, ...initial }));
  }, [location.pathname]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchNotifications = useCallback(() => {
    notificationApi.getMy().then((r) => {
      const unread = (r.data || []).filter((n: { is_read: boolean }) => !n.is_read).length;
      setUnreadCount(unread);
    }).catch(logError);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useNotificationRefresh(fetchNotifications);

  // Ctrl+K → open Analyze modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setAnalyzeUrl(undefined);
        setIsAnalyzeOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Handle 402 payment-due event dispatched by axios interceptor
  useEffect(() => {
    const handler = () => navigate('/billing');
    window.addEventListener('payment-due', handler);
    return () => window.removeEventListener('payment-due', handler);
  }, [navigate]);

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
        { to: '/admin?tab=ai-audit', icon: SparklesIcon, label: 'AI Audit' },
        { to: '/admin?tab=ml-audit', icon: SparklesIcon, label: 'ML Audit' },
      ],
    });
  }

  sections.push(
    {
      label: t('nav.section.main'),
      items: [
        { to: '/', icon: HomeIcon, label: t('nav.dashboard'), end: true },
        { to: '/discovery', icon: ArrowTrendingUpIcon, label: t('nav.discovery') },
      ],
    },
    {
      label: t('nav.section.product'),
      items: [
        { to: '/signals', icon: SignalIcon, label: t('nav.signals') },
        { to: '/leaderboard', icon: TrophyIcon, label: t('nav.leaderboard') },
      ],
    },
    {
      label: t('nav.tools'),
      items: [
        { to: '/calculator', icon: CalculatorIcon, label: t('nav.calculator') },
        { to: '/elasticity', icon: ScaleIcon, label: t('nav.elasticity') },
        { to: '/compare', icon: ScaleIcon, label: t('nav.compare') },
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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-primary focus:text-primary-content focus:rounded-md focus:m-2">
        {t('a11y.skipToContent')}
      </a>
      <input id="drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col">
        {/* Mobile navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 lg:hidden" role="navigation" aria-label="Mobile navigation">
          <label htmlFor="drawer" className="btn btn-ghost drawer-button" aria-label={t('layout.openMenu')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
          <span className="font-heading font-bold text-lg ml-2 tracking-tight">VENTRA</span>
          <div className="flex-1" />
          <button onClick={toggle} className="btn btn-ghost btn-sm btn-square" aria-label={isDark ? t('layout.lightMode') : t('layout.darkMode')}>
            {isDark ? <SunIcon className="w-4.5 h-4.5" /> : <MoonIcon className="w-4.5 h-4.5" />}
          </button>
          <NavLink to="/feedback" className="btn btn-ghost btn-sm relative" aria-label={t('nav.feedback')}>
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="badge badge-error badge-xs absolute -top-1 -right-1">{unreadCount}</span>
            )}
          </NavLink>
        </div>

        <main id="main-content" className="flex-1 p-4 lg:p-6 pb-16 lg:pb-6 ventra-main-bg relative" role="main" aria-live="polite">
          <div className="ventra-page-enter">
          <Outlet context={{ onOpenAnalyze: (url?: string) => { setAnalyzeUrl(url); setIsAnalyzeOpen(true); }, onOpenSearch: () => setIsSearchOpen(true) }} />
          </div>
        </main>
      </div>

      {/* ═══ SIDEBAR ═══ */}
      <div className="drawer-side z-40">
        <label htmlFor="drawer" className="drawer-overlay" />
        <aside className="ventra-sidebar w-[272px] h-screen sticky top-0 flex flex-col border-r border-base-300/60 overflow-hidden pb-16 lg:pb-0">

          {/* ── Logo ── */}
          <div className="px-5 py-4 border-b border-base-300/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-primary/20">
                <span className="text-primary-content font-black text-sm font-heading tracking-tight">V</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-[15px] leading-none tracking-[-0.03em] ventra-gradient-text">VENTRA</p>
                <p className="text-[11px] text-base-content/40 mt-0.5 font-medium">{t('layout.tagline')}</p>
              </div>
            </div>
          </div>

          {/* ── Navigation ── */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 sidebar-scroll" role="navigation" aria-label="Sidebar navigation">
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
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10.5px] uppercase tracking-[0.09em] font-bold transition-all duration-150 ${
                      isAdmin
                        ? 'text-error/55 hover:bg-error/6 hover:text-error/75'
                        : 'text-base-content/30 hover:bg-base-content/4 hover:text-base-content/50'
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
                        const sharedClass = `group relative flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-150 w-full text-left ${
                          active
                            ? 'ventra-nav-active text-primary font-semibold'
                            : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content/85 font-medium'
                        }`;

                        const inner = (
                          <>
                            {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary shadow-sm shadow-primary/40" />}
                            <Icon className={`w-[17px] h-[17px] shrink-0 transition-colors duration-150 ${active ? 'text-primary' : 'text-base-content/35 group-hover:text-base-content/55'}`} />
                            <span className="truncate">{item.label}</span>
                            {item.badge != null && item.badge > 0 && (
                              <span className="ml-auto text-[10px] font-bold bg-error/15 text-error px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                                {item.badge}
                              </span>
                            )}
                          </>
                        );

                        return item.onClick ? (
                          <button key={item.to} onClick={item.onClick} className={sharedClass}>
                            {inner}
                          </button>
                        ) : (
                          <NavLink key={item.to} to={item.to} end={item.end} className={sharedClass}>
                            {inner}
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
            {/* Theme + Language + What's New */}
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
              <div className="flex-1" />
              <button
                onClick={() => setShowWhatsNew(true)}
                className="btn btn-ghost btn-xs btn-square rounded-lg relative tooltip tooltip-top"
                data-tip={t('whatsNew.title')}
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                {hasUnseenUpdates && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            </div>

            {/* User + Streak + Logout */}
            <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-base-content/4 border border-base-300/30 hover:border-base-300/60 transition-colors duration-200">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 via-primary/15 to-secondary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/15">
                <span className="text-primary font-bold text-xs font-heading">
                  {isSuperAdmin ? 'SA' : userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate leading-tight">{isSuperAdmin ? 'Super Admin' : userEmail.split('@')[0]}</p>
                <p className="text-[10px] text-base-content/35 truncate mt-0.5">
                  {isSuperAdmin ? 'admin@ventra' : t('layout.proPlan')}
                </p>
              </div>
              <StreakBadge />
              <button
                onClick={logout}
                className="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/25 hover:text-error hover:bg-error/8 transition-all duration-150 tooltip tooltip-top"
                data-tip={t('nav.logout')}
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <BottomNav />
      <ScrollToTop />
      <WhatsNew externalOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} />
      <AnalyzeModal isOpen={isAnalyzeOpen} onClose={() => setIsAnalyzeOpen(false)} initialUrl={analyzeUrl} />
      <SearchDrawer isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ChatWidget />
    </div>
  );
}
