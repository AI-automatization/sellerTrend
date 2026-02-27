import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface MiniSparklineProps {
  data: number[];
  color: string;
  height?: number;
}

export function MiniSparkline({ data, color, height = 32 }: MiniSparklineProps) {
  if (data.length < 2) return null;
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
