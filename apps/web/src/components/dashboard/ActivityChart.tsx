import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useI18n } from '../../i18n/I18nContext';
import { GlassTooltip, FadeIn } from './index';

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
            <AreaChart data={activityData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<GlassTooltip fmt={(v: number) => v.toLocaleString() + ' ' + t('dashboard.perWeek')} />} />
              <Area type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2} fill="url(#salesGrad)"
                dot={{ r: 3, fill: '#22c55e', strokeWidth: 2, stroke: 'var(--color-base-100)' }}
                activeDot={{ r: 5 }} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </FadeIn>
  );
}
