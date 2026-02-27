import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartPoint {
  date: string;
  score: number;
}

const UZ_MONTHS = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Nov','Dek'];

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${UZ_MONTHS[d.getMonth()]}`;
}

export function ScoreChart({ data }: { data: ChartPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-base-content/40 text-sm text-center py-8">
        Ma'lumot yetarli emas
      </p>
    );
  }

  // Aggregate by day — take last score per day to avoid zigzag
  const dailyData = useMemo(() => {
    const map = new Map<string, ChartPoint>();
    for (const point of data) {
      const day = point.date.substring(0, 10);
      map.set(day, { ...point, date: day });
    }
    return Array.from(map.values());
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDay}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--chart-tooltip-text)',
          }}
          labelStyle={{ color: 'var(--chart-tick)' }}
          labelFormatter={formatDay}
          itemStyle={{ color: '#a78bfa' }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#a78bfa"
          strokeWidth={2}
          dot={dailyData.length <= 10}
          activeDot={{ r: 4, fill: '#a78bfa' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
