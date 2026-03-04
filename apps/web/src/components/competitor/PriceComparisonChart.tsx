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
import { glassTooltip, AXIS_TICK, CHART_COLORS, CHART_ANIMATION_MS } from '../../utils/chartTokens';

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
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            {...glassTooltip}
            formatter={(v: number) => [`${v.toLocaleString()} so'm`, 'Narx']}
          />
          <ReferenceLine
            y={ourPrice}
            stroke={CHART_COLORS[0]}
            strokeDasharray="4 2"
            strokeOpacity={0.4}
          />
          <Bar dataKey="price" radius={[4, 4, 0, 0]} animationDuration={CHART_ANIMATION_MS}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.isOurs
                    ? CHART_COLORS[0]
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
