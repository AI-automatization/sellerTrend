import type { Balance } from '../../api/types';
import { WalletIcon, ArrowTrendingUpIcon } from '../icons';
import { useI18n } from '../../i18n/I18nContext';
import { AnimatedNumber, MiniSparkline, FadeIn } from './index';

interface DashboardStats {
  totalWeekly: number;
  avgScore: number;
  rising: number;
  falling: number;
  flat: number;
  healthPct: number;
}

interface Props {
  stats: DashboardStats;
  balance: Balance | null;
  isSuperAdmin: boolean;
  paymentDue: boolean;
  scoreSparkline: number[];
  salesSparkline: number[];
  productsCount: number;
}

export function KPICards({ stats, balance, isSuperAdmin, paymentDue, scoreSparkline, salesSparkline, productsCount }: Props) {
  const { t } = useI18n();

  return (
    <div className={`grid grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3 lg:gap-4`}>
      {/* Balans */}
      {!isSuperAdmin && (
        <FadeIn delay={80} className="group">
          <div className={`relative h-full rounded-2xl p-4 lg:p-5 overflow-hidden ventra-card ${
            paymentDue
              ? 'bg-gradient-to-br from-error/8 to-error/3 border border-error/15'
              : 'bg-base-200/50 border border-base-300/40'
          }`}>
            <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-primary via-primary/40 to-transparent" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.balance')}</span>
              <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <WalletIcon className="w-3.5 h-3.5 text-primary/70" />
              </div>
            </div>
            <p className={`text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${paymentDue ? 'text-error' : ''}`}>
              {balance ? <AnimatedNumber value={Number(balance.balance)} /> : '—'}
            </p>
            <p className="text-[10px] text-base-content/25 mt-2 tabular-nums">
              so'm · {balance ? Number(balance.daily_fee).toLocaleString() : '—'}/kun
            </p>
          </div>
        </FadeIn>
      )}

      {/* Kuzatuv */}
      <FadeIn delay={120} className="group">
        <div className="relative h-full rounded-2xl p-4 lg:p-5 bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
          <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-accent via-accent/40 to-transparent" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.productsCount')}</span>
            <div className="w-7 h-7 rounded-lg bg-accent/8 flex items-center justify-center group-hover:bg-accent/15 transition-colors">
              <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-accent/70" />
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold tabular-nums tracking-tight">
            <AnimatedNumber value={productsCount} />
          </p>
          <div className="mt-2 opacity-40">
            <MiniSparkline data={scoreSparkline} color="var(--color-accent)" height={24} />
          </div>
        </div>
      </FadeIn>

      {/* Haftalik */}
      <FadeIn delay={160} className="group">
        <div className="relative h-full rounded-2xl p-4 lg:p-5 bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
          <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-success via-success/40 to-transparent" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.weeklySales')}</span>
            <div className="w-7 h-7 rounded-lg bg-success/8 flex items-center justify-center group-hover:bg-success/15 transition-colors">
              <svg className="w-3.5 h-3.5 text-success/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold tabular-nums tracking-tight text-success">
            <AnimatedNumber value={stats.totalWeekly} />
          </p>
          <div className="mt-2 opacity-40">
            <MiniSparkline data={salesSparkline} color="#22c55e" height={24} />
          </div>
        </div>
      </FadeIn>

      {/* O'rta Score */}
      <FadeIn delay={200} className="group">
        <div className="relative h-full rounded-2xl p-4 lg:p-5 bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
          <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-warning via-warning/40 to-transparent" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.avgScore')}</span>
            <div className="w-7 h-7 rounded-lg bg-warning/8 flex items-center justify-center group-hover:bg-warning/15 transition-colors">
              <svg className="w-3.5 h-3.5 text-warning/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
          </div>
          <p className={`text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${stats.avgScore >= 6 ? 'text-success' : stats.avgScore >= 4 ? 'text-warning' : 'text-base-content/40'}`}>
            <AnimatedNumber value={stats.avgScore} decimals={2} />
          </p>
          <p className="text-[10px] text-base-content/25 mt-2">
            <span className="text-success">{stats.rising}↗</span>{' '}
            <span className="text-error">{stats.falling}↘</span>{' '}
            <span className="text-base-content/20">{stats.flat}→</span>
          </p>
        </div>
      </FadeIn>

      {/* Portfolio salomatligi */}
      <FadeIn delay={240} className="group col-span-2 lg:col-span-1">
        <div className="relative h-full rounded-2xl p-4 lg:p-5 bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
          <div className={`absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b ${
            stats.healthPct >= 70 ? 'from-success via-success/40 to-transparent'
            : stats.healthPct >= 40 ? 'from-warning via-warning/40 to-transparent'
            : 'from-error via-error/40 to-transparent'
          }`} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.health')}</span>
            <div className="w-7 h-7 rounded-lg bg-info/8 flex items-center justify-center group-hover:bg-info/15 transition-colors">
              <svg className="w-3.5 h-3.5 text-info/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
          </div>
          <p className={`text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${
            stats.healthPct >= 70 ? 'text-success' : stats.healthPct >= 40 ? 'text-warning' : 'text-error'
          }`}>
            <AnimatedNumber value={stats.healthPct} />%
          </p>
          <div className="mt-2.5 h-1 rounded-full bg-base-300/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                stats.healthPct >= 70 ? 'bg-success' : stats.healthPct >= 40 ? 'bg-warning' : 'bg-error'
              }`}
              style={{ width: `${stats.healthPct}%` }}
            />
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
