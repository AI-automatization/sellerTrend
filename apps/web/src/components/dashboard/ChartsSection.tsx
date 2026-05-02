import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { TrackedProduct } from '../../api/types';
import { scoreColor } from '../../utils/formatters';
import { useI18n } from '../../i18n/I18nContext';
import { GlassTooltip, FadeIn } from './index';
import { CHART_ANIMATION_MS } from '../../utils/chartTokens';

interface DashboardStats {
  avgScore: number;
  rising: number;
  falling: number;
  flat: number;
  healthPct: number;
}

interface Props {
  scoreChartData: { name: string; score: number; id: string }[];
  trendPieData: { name: string; value: number; fill: string }[];
  stats: DashboardStats;
  products: TrackedProduct[];
}

export function ChartsSection({ scoreChartData }: Props) {
  const { t } = useI18n();

  return (
    <FadeIn delay={320}>
      <div className="rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
        <div className="px-5 py-4 border-b border-base-300/20 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm font-heading">{t('dashboard.scoreRating')}</h2>
            <p className="text-[10px] text-base-content/25 mt-0.5">Top {scoreChartData.length} {t('dashboard.products')}</p>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-base-content/25">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success/60" />6+</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning/60" />4-6</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-base-content/15" />&lt;4</span>
          </div>
        </div>
        <div className="p-4 lg:p-5 max-h-96 overflow-y-auto">
          {scoreChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(260, scoreChartData.length * 30)}>
              <BarChart data={scoreChartData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} domain={[0, 10]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} width={130} />
                <Tooltip content={<GlassTooltip fmt={(v: number) => v.toFixed(2) + ' / 10'} />} cursor={{ fill: 'var(--chart-cursor)' }} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16} animationDuration={CHART_ANIMATION_MS}>
                  {scoreChartData.map((entry) => (
                    <Cell key={entry.id} fill={scoreColor(entry.score)} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-base-content/15 text-sm">{t('common.noData')}</div>
          )}
        </div>
      </div>
    </FadeIn>
  );
}

