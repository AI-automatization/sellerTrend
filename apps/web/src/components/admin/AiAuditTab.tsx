import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { RagAuditStats } from './adminTypes';

interface Props {
  stats: RagAuditStats | null;
  loading: boolean;
  period: number;
  onPeriodChange: (p: number) => void;
}

const INTENT_LABELS: Record<string, string> = {
  PRODUCT_ANALYSIS: 'Mahsulot tahlili',
  CATEGORY_TREND: 'Kategoriya trendi',
  PRICE_ADVICE: 'Narx maslahati',
  RECOMMENDATION: 'Tavsiya',
  DEAD_STOCK: 'Qotib qolish xavfi',
  COMPETITOR: 'Raqobatchilar',
  REVENUE: 'Daromad',
  FORECAST: 'Prognoz',
  NICHE: 'Niche tahlili',
  GENERAL: 'Umumiy',
};

function StatCard({ label, value, sub, color = '' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl bg-base-200/60 border border-base-300/40 p-4">
      <p className="text-xs text-base-content/50 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-base-content/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export function AiAuditTab({ stats, loading, period, onPeriodChange }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="loading loading-ring loading-md text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-base">RAG Pipeline Sifati</h2>
          <p className="text-xs text-base-content/40">Chat AI javoblari — foydalanuvchi qoniqishi va narx</p>
        </div>
        <div className="flex gap-1">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => onPeriodChange(d)}
              className={`btn btn-xs ${period === d ? 'btn-primary' : 'btn-ghost'}`}
            >
              {d}k
            </button>
          ))}
        </div>
      </div>

      {!stats ? (
        <div className="alert alert-info text-sm">Hali chat ma'lumotlari yo'q.</div>
      ) : (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Jami AI javobi"
              value={stats.assistant_messages.toLocaleString()}
              sub={`${stats.total_messages.toLocaleString()} ta xabar jami`}
            />
            <StatCard
              label="Foydalanuvchi qoniqishi"
              value={stats.feedback.satisfaction_pct != null ? `${stats.feedback.satisfaction_pct}%` : '—'}
              sub={`${stats.feedback.up}👍 / ${stats.feedback.down}👎 (${stats.feedback.total} ta feedback)`}
              color={
                stats.feedback.satisfaction_pct == null ? '' :
                stats.feedback.satisfaction_pct >= 80 ? 'text-success' :
                stats.feedback.satisfaction_pct >= 60 ? 'text-warning' : 'text-error'
              }
            />
            <StatCard
              label="Jami narx (AI)"
              value={`$${stats.cost.total_usd}`}
              sub={`O'rtacha $${stats.cost.avg_per_message} / javob`}
            />
            <StatCard
              label="Tokenlar"
              value={(stats.cost.input_tokens + stats.cost.output_tokens).toLocaleString()}
              sub={`${stats.cost.input_tokens.toLocaleString()} kirish + ${stats.cost.output_tokens.toLocaleString()} chiqish`}
            />
          </div>

          {/* Feedback quality alert */}
          {stats.feedback.satisfaction_pct != null && stats.feedback.satisfaction_pct < 60 && (
            <div className="alert alert-warning text-sm gap-2">
              <span>⚠️</span>
              <span>
                Foydalanuvchi qoniqishi <strong>{stats.feedback.satisfaction_pct}%</strong> — 60% dan past.
                RAG kontekstini yaxshilash yoki prompt yangilash tavsiya etiladi.
              </span>
            </div>
          )}

          {/* Daily messages chart */}
          {stats.daily.length > 0 && (
            <div className="rounded-xl bg-base-200/60 border border-base-300/40 p-4">
              <p className="text-sm font-semibold mb-3">Kunlik AI javoblar</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={stats.daily} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(var(--p))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(var(--p))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    labelFormatter={(v: string) => `Sana: ${v}`}
                    formatter={(v: number) => [`${v} ta`, 'Javob']}
                  />
                  <Area
                    type="monotone" dataKey="messages"
                    stroke="oklch(var(--p))" fill="url(#msgGrad)" strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Intent breakdown */}
          {stats.by_intent.length > 0 && (
            <div className="rounded-xl bg-base-200/60 border border-base-300/40 p-4">
              <p className="text-sm font-semibold mb-3">So'rov turlari (Intent)</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={stats.by_intent.map((r) => ({
                    name: INTENT_LABELS[r.intent] ?? r.intent,
                    count: r.count,
                  }))}
                  margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => [`${v} ta`, 'So\'rov']} />
                  <Bar dataKey="count" fill="oklch(var(--s))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Feedback breakdown table */}
          <div className="rounded-xl bg-base-200/60 border border-base-300/40 p-4">
            <p className="text-sm font-semibold mb-3">Feedback tafsiloti</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-success">{stats.feedback.up}</p>
                <p className="text-xs text-base-content/50 mt-0.5">👍 Foydali</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-error">{stats.feedback.down}</p>
                <p className="text-xs text-base-content/50 mt-0.5">👎 Noto'g'ri</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-base-content/60">{stats.feedback.total}</p>
                <p className="text-xs text-base-content/50 mt-0.5">Jami feedback</p>
              </div>
            </div>
            {stats.feedback.total > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-xs text-base-content/50 mb-1">
                  <span>Qoniqish darajasi</span>
                  <span className="ml-auto font-semibold text-base-content">
                    {stats.feedback.satisfaction_pct ?? 0}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-base-300 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-success transition-all"
                    style={{ width: `${stats.feedback.satisfaction_pct ?? 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
