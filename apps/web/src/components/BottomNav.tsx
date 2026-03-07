import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, MagnifyingGlassIcon, ArrowTrendingUpIcon, SignalIcon, GlobeAltIcon } from './icons';
import { useI18n } from '../i18n/I18nContext';

const NAV_ITEMS = [
  { to: '/', icon: HomeIcon, labelKey: 'nav.dashboard', end: true },
  { to: '/analyze', icon: MagnifyingGlassIcon, labelKey: 'nav.analyze', end: false },
  { to: '/discovery', icon: ArrowTrendingUpIcon, labelKey: 'nav.discovery', end: false },
  { to: '/signals', icon: SignalIcon, labelKey: 'nav.signals', end: false },
  { to: '/sourcing', icon: GlobeAltIcon, labelKey: 'nav.sourcing', end: false },
] as const;

export function BottomNav() {
  const { t } = useI18n();
  const location = useLocation();

  function isActive(item: typeof NAV_ITEMS[number]) {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden btm-nav btm-nav-sm bg-base-200 border-t border-base-300"
      role="navigation"
      aria-label="Bottom navigation"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={active ? 'active text-primary' : 'text-base-content/50'}
          >
            <Icon className="w-5 h-5" />
            <span className="btm-nav-label text-[10px]">{t(item.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
