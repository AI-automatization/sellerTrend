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
    <FadeIn delay={160}>
      <div className="grid grid-cols-1 gap-3">
        {best && (
          <div className="group relative rounded-xl overflow-hidden ventra-card border border-primary/10 bg-gradient-to-br from-primary/5 via-base-200/60 to-base-200/30">
            <div className="relative p-3 lg:p-4 flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs shrink-0">🏆</span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.12em] mb-0.5">{t('dashboard.bestScore')}</p>
                <Link to={`/products/${best.product_id}`}
                  className="font-semibold text-[13px] leading-snug hover:text-primary transition-colors line-clamp-1 block">
                  {best.title}
                </Link>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-sm font-bold text-primary tabular-nums">{best.score?.toFixed(1) ?? '—'}</span>
                  <span className="text-[10px] text-base-content/30">/ 10</span>
                  <TrendChip trend={best.trend} />
                </div>
              </div>
            </div>
          </div>
        )}
        {mostActive && (
          <div className="group relative rounded-xl overflow-hidden ventra-card border border-success/10 bg-gradient-to-br from-success/5 via-base-200/60 to-base-200/30">
            <div className="relative p-3 lg:p-4 flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center text-xs shrink-0">🔥</span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.12em] mb-0.5">{t('dashboard.mostActive')}</p>
                <Link to={`/products/${mostActive.product_id}`}
                  className="font-semibold text-[13px] leading-snug hover:text-success transition-colors line-clamp-1 block">
                  {mostActive.title}
                </Link>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-sm font-bold text-success tabular-nums">{mostActive.weekly_bought?.toLocaleString() ?? '—'}</span>
                  <span className="text-[10px] text-base-content/30">{t('dashboard.perWeek')}</span>
                  <TrendChip trend={mostActive.trend} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
