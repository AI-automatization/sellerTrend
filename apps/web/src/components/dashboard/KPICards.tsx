import { ArrowTrendingUpIcon } from '../icons';
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
  scoreSparkline: number[];
  salesSparkline: number[];
  productsCount: number;
}

export function KPICards({ stats, scoreSparkline, salesSparkline, productsCount }: Props) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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

      {/* Ko'tarilayotgan */}
      <FadeIn delay={200} className="group">
        <div className="relative h-full rounded-2xl p-4 lg:p-5 bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
          <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-success via-success/40 to-transparent" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.rising')}</span>
            <div className="w-7 h-7 rounded-lg bg-success/8 flex items-center justify-center group-hover:bg-success/15 transition-colors">
              <svg className="w-3.5 h-3.5 text-success/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold tabular-nums tracking-tight text-success">
            <AnimatedNumber value={stats.rising} />
          </p>
          <p className="text-[10px] text-base-content/25 mt-2">
            {t('dashboard.outOf').replace('{total}', String(productsCount))}
          </p>
        </div>
      </FadeIn>

      {/* Tushayotgan */}
      <FadeIn delay={240} className="group col-span-2 lg:col-span-1">
        <div className="relative h-full rounded-2xl p-4 lg:p-5 bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
          <div className={`absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b ${
            stats.falling === 0 ? 'from-success via-success/40 to-transparent'
            : stats.falling <= Math.ceil(productsCount * 0.3) ? 'from-warning via-warning/40 to-transparent'
            : 'from-error via-error/40 to-transparent'
          }`} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.falling')}</span>
            <div className="w-7 h-7 rounded-lg bg-error/8 flex items-center justify-center group-hover:bg-error/15 transition-colors">
              <svg className="w-3.5 h-3.5 text-error/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" />
              </svg>
            </div>
          </div>
          <p className={`text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${
            stats.falling === 0 ? 'text-success' : stats.falling <= Math.ceil(productsCount * 0.3) ? 'text-warning' : 'text-error'
          }`}>
            <AnimatedNumber value={stats.falling} />
          </p>
          <p className="text-[10px] text-base-content/25 mt-2">
            {t('dashboard.outOf').replace('{total}', String(productsCount))}
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
