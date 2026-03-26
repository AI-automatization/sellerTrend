import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';
import { useI18n } from '../../i18n/I18nContext';
import { GlassTooltip, FadeIn } from './index';
import { CHART_ANIMATION_MS } from '../../utils/chartTokens';

interface Props {
  activityData: { name: string; sales: number }[];
  totalWeekly: number;
}

export function ActivityChart({ activityData, totalWeekly }: Props) {
  const { t } = useI18n();

  if (activityData.length === 0) return null;

  return (
    <FadeIn delay={360}>
      <div className="rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
        <div className="px-5 py-4 border-b border-base-300/20 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm font-heading">{t('dashboard.weeklySalesChart')}</h2>
            <p className="text-[10px] text-base-content/25 mt-0.5">Top {activityData.length} — {t('dashboard.last7days')}</p>
          </div>
          <span className="text-xs font-mono text-success/80 font-semibold tabular-nums">{totalWeekly.toLocaleString()} {t('common.unit')}</span>
        </div>
        <div className="p-4 lg:p-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activityData} margin={{ top: 20, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<GlassTooltip fmt={(v: number) => v.toLocaleString() + ' ' + t('dashboard.perWeek')} />} />
              <Bar dataKey="sales" fill="#22c55e" fillOpacity={0.85} radius={[6, 6, 0, 0]} animationDuration={CHART_ANIMATION_MS}>
                <LabelList dataKey="sales" position="top" style={{ fontSize: 10, fill: 'var(--chart-tick)' }} formatter={(v: number) => v > 0 ? v.toLocaleString() : ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </FadeIn>
  );
}
