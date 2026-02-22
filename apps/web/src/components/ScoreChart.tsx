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

export function ScoreChart({ data }: { data: ChartPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-base-content/40 text-sm text-center py-8">
        Ma'lumot yetarli emas
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: '#1d232a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
          itemStyle={{ color: '#a78bfa' }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#a78bfa"
          strokeWidth={2}
          dot={data.length <= 10}
          activeDot={{ r: 4, fill: '#a78bfa' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
