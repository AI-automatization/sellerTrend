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

interface ScoreChartProps {
  data: ChartPoint[];
}

export function ScoreChart({ data }: ScoreChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-slate-400 text-sm">Ma'lumot yetarli emas</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
