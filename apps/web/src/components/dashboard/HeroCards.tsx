import { Link } from 'react-router-dom';
import type { TrackedProduct } from '../../api/types';
import { useI18n } from '../../i18n/I18nContext';
import { TrendChip, FadeIn } from './index';

interface Props {
  best: TrackedProduct | undefined;
  mostActive: TrackedProduct | undefined;
}

export function HeroCards({ best, mostActive }: Props) {
  const { t } = useI18n();

  if (!best && !mostActive) return null;

  return (
    <FadeIn delay={280}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {best && (
          <div className="group relative rounded-2xl overflow-hidden ventra-card border border-primary/10 bg-gradient-to-br from-primary/5 via-base-200/60 to-base-200/30">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/4 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl group-hover:scale-125 transition-transform duration-700" />
            <div className="relative p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-sm">🏆</span>
                <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.bestScore')}</span>
              </div>
              <Link to={`/products/${best.product_id}`}
                className="font-bold text-[15px] leading-snug hover:text-primary transition-colors line-clamp-2 block">
                {best.title}
              </Link>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-3xl font-bold text-primary tabular-nums tracking-tight font-heading">
                  {best.score?.toFixed(2) ?? '—'}
                </span>
                <TrendChip trend={best.trend} />
                {best.sell_price && (
                  <span className="text-xs text-base-content/30 ml-auto tabular-nums">
                    {best.sell_price.toLocaleString()} {t('common.som')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {mostActive && (
          <div className="group relative rounded-2xl overflow-hidden ventra-card border border-success/10 bg-gradient-to-br from-success/5 via-base-200/60 to-base-200/30">
            <div className="absolute top-0 right-0 w-40 h-40 bg-success/4 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl group-hover:scale-125 transition-transform duration-700" />
            <div className="relative p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center text-sm">🔥</span>
                <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.mostActive')}</span>
              </div>
              <Link to={`/products/${mostActive.product_id}`}
                className="font-bold text-[15px] leading-snug hover:text-success transition-colors line-clamp-2 block">
                {mostActive.title}
              </Link>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-3xl font-bold text-success tabular-nums tracking-tight font-heading">
                  {mostActive.weekly_bought?.toLocaleString() ?? '—'}
                </span>
                <span className="text-xs text-base-content/30">{t('dashboard.perWeek')}</span>
                <TrendChip trend={mostActive.trend} />
              </div>
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
