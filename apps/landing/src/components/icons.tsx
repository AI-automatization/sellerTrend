import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const defaults: IconProps = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

// ── Features ──────────────────────────────────────
export const BarChartIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="8" rx=".5" fill="currentColor" opacity=".3" /><rect x="12" y="6" width="3" height="12" rx=".5" fill="currentColor" opacity=".5" /><rect x="17" y="3" width="3" height="15" rx=".5" fill="currentColor" opacity=".7" /></svg>
);

export const SparklesIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" fill="currentColor" opacity=".2" /><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" /></svg>
);

export const BellIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
);

export const EyeIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);

export const GlobeIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
);

export const CpuIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity=".2" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" /></svg>
);

export const CalculatorIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><rect x="4" y="2" width="16" height="20" rx="2" /><rect x="7" y="5" width="10" height="4" rx="1" fill="currentColor" opacity=".15" /><circle cx="8" cy="13" r=".8" fill="currentColor" /><circle cx="12" cy="13" r=".8" fill="currentColor" /><circle cx="16" cy="13" r=".8" fill="currentColor" /><circle cx="8" cy="17" r=".8" fill="currentColor" /><circle cx="12" cy="17" r=".8" fill="currentColor" /><circle cx="16" cy="17" r=".8" fill="currentColor" /></svg>
);

export const MessageIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);

export const MonitorIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
);

export const PuzzleIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.611a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.315 8.685a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.611-1.611a2.404 2.404 0 0 1 1.704-.706c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02z" /></svg>
);

// ── Stats ──────────────────────────────────────────
export const UsersIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);

export const PackageIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><path d="M16.5 9.4l-9-5.19" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.27 6.96L12 12.01l8.73-5.05" /><path d="M12 22.08V12" /></svg>
);

export const ZapIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" opacity=".15" /></svg>
);

export const ActivityIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);

export const TrendUpIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
);

// ── Pain Points ────────────────────────────────────
export const HelpCircleIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);

export const ShieldAlertIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);

export const SearchXIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="8" x2="14" y2="14" /><line x1="14" y1="8" x2="8" y2="14" /></svg>
);

// ── Misc ───────────────────────────────────────────
export const MailIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
);

export const SunIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
);

export const MoonIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...defaults} {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
);
