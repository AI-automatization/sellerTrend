import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import type { TrackedProduct } from '../../api/types';
import { scoreColor } from '../../utils/formatters';
import { useI18n } from '../../i18n/I18nContext';
import { GlassTooltip, FadeIn } from './index';

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

export function ChartsSection({ scoreChartData, trendPieData, stats, products }: Props) {
  const { t } = useI18n();

  return (
    <FadeIn delay={320}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Score comparison — horizontal bar */}
        <div className="xl:col-span-8 rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
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
          <div className="p-4 lg:p-5">
            {scoreChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(260, scoreChartData.length * 30)}>
                <BarChart data={scoreChartData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} domain={[0, 10]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip content={<GlassTooltip fmt={(v: number) => v.toFixed(2) + ' / 10'} />} cursor={{ fill: 'var(--chart-cursor)' }} />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16} animationDuration={800}>
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

        {/* Right column */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          {/* Trend donut */}
          <div className="rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card flex-1">
            <div className="px-5 py-4 border-b border-base-300/20">
              <h2 className="font-semibold text-sm font-heading">{t('dashboard.trendDistribution')}</h2>
              <p className="text-[10px] text-base-content/25 mt-0.5">{products.length} {t('dashboard.products')}</p>
            </div>
            <div className="p-4">
              {trendPieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={trendPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70}
                        paddingAngle={3} dataKey="value" strokeWidth={0} animationDuration={800}>
                        {trendPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip content={<GlassTooltip />} />
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" className="fill-base-content text-2xl font-bold font-heading">
                        {products.length}
                      </text>
                      <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" className="fill-base-content/25 text-[9px]">
                        {t('dashboard.products')}
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-1">
                    {trendPieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                        <span className="text-base-content/40">{d.name}</span>
                        <span className="font-bold tabular-nums text-base-content/60">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-36 text-base-content/15 text-xs">{t('dashboard.trendNoData')}</div>
              )}
            </div>
          </div>

          {/* Score ring */}
          <div className="rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
            <div className="px-5 py-4 border-b border-base-300/20">
              <h2 className="font-semibold text-sm font-heading">{t('dashboard.scoreSummary')}</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-5">
                <div className="relative w-[72px] h-[72px] shrink-0">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="var(--chart-grid, oklch(0.7 0 0 / 0.12))" strokeWidth="7" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor(stats.avgScore)}
                      strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={`${(stats.avgScore / 10) * 201} 201`}
                      className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-base font-bold tabular-nums ${stats.avgScore >= 6 ? 'text-success' : stats.avgScore >= 4 ? 'text-warning' : 'text-base-content/40'}`}>
                      {stats.avgScore.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-base-content/35">{t('dashboard.highest')}</span>
                    <span className="font-bold text-success tabular-nums">
                      {products.length > 0 ? Math.max(...products.map((p) => p.score ?? 0)).toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-base-content/35">{t('dashboard.average')}</span>
                    <span className="font-bold tabular-nums">{stats.avgScore.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-base-content/35">{t('dashboard.lowest')}</span>
                    <span className="font-bold text-base-content/30 tabular-nums">
                      {products.length > 0 ? Math.min(...products.map((p) => p.score ?? 0)).toFixed(2) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
