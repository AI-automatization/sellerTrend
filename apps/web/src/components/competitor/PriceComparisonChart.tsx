import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { CompetitorProduct } from '../../api/competitor';

interface Props {
  ourProduct: { title: string; sell_price: string | null };
  competitors: CompetitorProduct[];
}

interface ChartEntry {
  name: string;
  price: number;
  isOurs: boolean;
}

export function PriceComparisonChart({ ourProduct, competitors }: Props) {
  const ourPrice = ourProduct.sell_price ? Number(ourProduct.sell_price) : null;
  if (!ourPrice) return null;

  const withPrices = competitors.filter((c) => c.latest_price !== null);
  if (withPrices.length === 0) return null;

  const data: ChartEntry[] = [
    {
      name: ourProduct.title.length > 14 ? ourProduct.title.slice(0, 14) + '…' : ourProduct.title,
      price: ourPrice,
      isOurs: true,
    },
    ...withPrices.slice(0, 5).map((c) => ({
      name: c.title.length > 14 ? c.title.slice(0, 14) + '…' : c.title,
      price: Number(c.latest_price),
      isOurs: false,
    })),
  ];

  return (
    <div>
      <p className="text-xs text-base-content/50 mb-2">O'zimiz vs top-5 raqib (so'm)</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 48 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            tickLine={false}
            axisLine={false}
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: '#1d232a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => [`${v.toLocaleString()} so'm`, 'Narx']}
          />
          <ReferenceLine
            y={ourPrice}
            stroke="#570df8"
            strokeDasharray="4 2"
            strokeOpacity={0.4}
          />
          <Bar dataKey="price" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.isOurs
                    ? '#570df8'
                    : entry.price < ourPrice
                    ? '#ef4444'
                    : '#22c55e'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-xs text-base-content/40 mt-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" /> Bizning narx</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-error inline-block" /> Arzonroq</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success inline-block" /> Qimmatroq</span>
      </div>
    </div>
  );
}
