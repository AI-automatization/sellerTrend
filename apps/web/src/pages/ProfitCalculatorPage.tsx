import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { sourcingApi } from '../api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Inputs {
  sell_price: string;
  buy_price_usd: string;
  usd_rate: string;
  commission_pct: number;
  fbo_cost: string;
  ad_cost: string;
  quantity: string;
}

interface CalcResult {
  buyPriceUzs: number;
  commissionAmount: number;
  variableCostPerUnit: number;
  totalCostPerUnit: number;
  profitPerUnit: number;
  totalProfit: number;
  marginPct: number;
  roiPct: number;
  breakevenQty: number;
  chartData: { units: number; cashFlow: number }[];
}

// ─── Calculator logic ─────────────────────────────────────────────────────────

function calcResults(inputs: Inputs): CalcResult {
  const sellPrice = Number(inputs.sell_price) || 0;
  const buyPriceUsd = Number(inputs.buy_price_usd) || 0;
  const usdRate = Number(inputs.usd_rate) || 12900;
  const commissionPct = inputs.commission_pct;
  const fboCost = Number(inputs.fbo_cost) || 0;
  const adCost = Number(inputs.ad_cost) || 0;
  const quantity = Math.max(1, Number(inputs.quantity) || 1);

  const buyPriceUzs = buyPriceUsd * usdRate;
  const commissionAmount = sellPrice * (commissionPct / 100);
  const variableCostPerUnit = commissionAmount + fboCost + adCost;
  const totalCostPerUnit = buyPriceUzs + variableCostPerUnit;
  const profitPerUnit = sellPrice - totalCostPerUnit;
  const totalProfit = profitPerUnit * quantity;
  const marginPct = sellPrice > 0 ? (profitPerUnit / sellPrice) * 100 : 0;
  const roiPct = totalCostPerUnit > 0 ? (profitPerUnit / totalCostPerUnit) * 100 : 0;

  // Breakeven: how many units to sell to recover full inventory investment
  const totalInvestment = buyPriceUzs * quantity;
  const contributionPerUnit = sellPrice - variableCostPerUnit;
  const breakevenQty =
    contributionPerUnit > 0 ? Math.ceil(totalInvestment / contributionPerUnit) : Infinity;

  // Chart: x = units sold, y = cash flow (revenue - all costs)
  const maxX = Math.max(quantity, isFinite(breakevenQty) ? breakevenQty * 1.2 : quantity);
  const steps = 40;
  const step = Math.max(1, Math.ceil(maxX / steps));
  const chartData: { units: number; cashFlow: number }[] = [];
  for (let x = 0; x <= maxX; x += step) {
    chartData.push({ units: x, cashFlow: Math.round(x * contributionPerUnit - totalInvestment) });
  }
  if (chartData[chartData.length - 1].units < maxX) {
    chartData.push({ units: Math.round(maxX), cashFlow: Math.round(maxX * contributionPerUnit - totalInvestment) });
  }

  return {
    buyPriceUzs,
    commissionAmount,
    variableCostPerUnit,
    totalCostPerUnit,
    profitPerUnit,
    totalProfit,
    marginPct,
    roiPct,
    breakevenQty,
    chartData,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfitCalculatorPage() {
  const [searchParams] = useSearchParams();

  const [inputs, setInputs] = useState<Inputs>({
    sell_price: searchParams.get('sell_price') ?? '',
    buy_price_usd: searchParams.get('buy_price_usd') ?? '',
    usd_rate: '12900',
    commission_pct: 10,
    fbo_cost: '',
    ad_cost: '',
    quantity: '100',
  });
  const [loadingRate, setLoadingRate] = useState(false);

  // Auto-load USD/UZS rate from API
  useEffect(() => {
    setLoadingRate(true);
    sourcingApi
      .getCurrencyRates()
      .then((res) => {
        const rate = (res.data as { USD?: number })?.USD;
        if (rate && rate > 0) {
          setInputs((prev) => ({ ...prev, usd_rate: String(rate) }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRate(false));
  }, []);

  function set(key: keyof Inputs, value: string | number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  const r = calcResults(inputs);
  const hasResult = Number(inputs.sell_price) > 0 && Number(inputs.buy_price_usd) > 0;

  const marginColor =
    r.marginPct >= 30 ? 'text-success' : r.marginPct >= 15 ? 'text-warning' : 'text-error';
  const marginBadge =
    r.marginPct >= 30 ? 'badge-success' : r.marginPct >= 15 ? 'badge-warning' : 'badge-error';
  const marginLabel =
    r.marginPct >= 30 ? "Zo'r" : r.marginPct >= 15 ? "O'rtacha" : 'Past';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Foyda Kalkulyatori</h1>
        <p className="text-base-content/50 text-sm mt-0.5">
          Uzum savdosi uchun sof foyda, margin va ROI hisobi
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Inputs ── */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="font-semibold text-sm text-base-content/70">Kirish ma'lumotlari</h2>

            {/* Sell price */}
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text text-xs">Sotuv narxi (so'm)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm"
                placeholder="masalan: 85 000"
                value={inputs.sell_price}
                onChange={(e) => set('sell_price', e.target.value)}
              />
            </div>

            {/* Buy price + USD rate */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control gap-1">
                <label className="label py-0">
                  <span className="label-text text-xs">Xarid narxi ($)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  placeholder="masalan: 3.50"
                  step="0.01"
                  value={inputs.buy_price_usd}
                  onChange={(e) => set('buy_price_usd', e.target.value)}
                />
              </div>
              <div className="form-control gap-1">
                <label className="label py-0">
                  <span className="label-text text-xs">USD/UZS kurs</span>
                  {loadingRate && (
                    <span className="loading loading-spinner loading-xs opacity-50" />
                  )}
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  value={inputs.usd_rate}
                  onChange={(e) => set('usd_rate', e.target.value)}
                />
              </div>
            </div>

            {inputs.buy_price_usd && (
              <p className="text-xs text-base-content/40 -mt-2">
                ≈ {r.buyPriceUzs.toLocaleString()} so'm / dona
              </p>
            )}

            {/* Commission slider */}
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text text-xs">Uzum komissiya %</span>
                <span className="label-text-alt font-bold text-primary text-sm">
                  {inputs.commission_pct}%
                </span>
              </label>
              <input
                type="range"
                className="range range-primary range-sm"
                min={5}
                max={15}
                step={1}
                value={inputs.commission_pct}
                onChange={(e) => set('commission_pct', Number(e.target.value))}
                aria-label="Uzum komissiya foizi"
              />
              <div className="flex justify-between text-xs text-base-content/30 px-1">
                <span>5%</span>
                <span>10%</span>
                <span>15%</span>
              </div>
            </div>

            {/* FBO + Ads */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control gap-1">
                <label className="label py-0">
                  <span className="label-text text-xs">FBO xarajati (so'm)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  placeholder="ixtiyoriy"
                  value={inputs.fbo_cost}
                  onChange={(e) => set('fbo_cost', e.target.value)}
                />
              </div>
              <div className="form-control gap-1">
                <label className="label py-0">
                  <span className="label-text text-xs">Reklama xarajati (so'm)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  placeholder="ixtiyoriy"
                  value={inputs.ad_cost}
                  onChange={(e) => set('ad_cost', e.target.value)}
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text text-xs">Miqdor (dona)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm"
                placeholder="masalan: 100"
                min={1}
                value={inputs.quantity}
                onChange={(e) => set('quantity', e.target.value)}
              />
            </div>

            <div className="divider my-0" />

            <Link to="/sourcing" className="btn btn-outline btn-sm gap-2">
              🌏 Manba qo'shish (Sourcing)
            </Link>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        {!hasResult ? (
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body items-center justify-center py-20 text-center">
              <p className="text-5xl mb-3">💰</p>
              <p className="text-base-content/50 text-sm">
                Sotuv va xarid narxini kiriting
              </p>
              <p className="text-base-content/30 text-xs mt-1">
                Natija avtomatik hisoblanadi
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body gap-4">
                <h2 className="font-semibold text-sm text-base-content/70">Natijalar</h2>

                {/* Total net profit — big number */}
                <div className="text-center py-2">
                  <p className="text-xs text-base-content/50 mb-1">Sof foyda (jami)</p>
                  <p
                    className={`text-4xl font-bold tabular-nums ${
                      r.totalProfit >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {r.totalProfit >= 0 ? '+' : ''}
                    {Math.round(r.totalProfit).toLocaleString()}
                  </p>
                  <p className="text-xs text-base-content/40 mt-1">
                    so'm · {Number(inputs.quantity).toLocaleString()} donadan
                  </p>
                </div>

                <div className="divider my-0" />

                {/* Margin */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-base-content/50">Margin</span>
                    <span className={`font-bold tabular-nums ${marginColor}`}>
                      {r.marginPct.toFixed(1)}%
                      <span className={`badge badge-sm ml-2 ${marginBadge}`}>
                        {marginLabel}
                      </span>
                    </span>
                  </div>
                  <progress
                    className={`progress w-full ${
                      r.marginPct >= 30
                        ? 'progress-success'
                        : r.marginPct >= 15
                        ? 'progress-warning'
                        : 'progress-error'
                    }`}
                    value={Math.max(0, Math.min(50, r.marginPct))}
                    max={50}
                  />
                  <div className="flex justify-between text-xs text-base-content/20 mt-0.5 px-0.5">
                    <span>0%</span>
                    <span className="text-error/60">15%</span>
                    <span className="text-warning/60">30%</span>
                    <span>50%+</span>
                  </div>
                </div>

                {/* ROI + Breakeven */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-base-300 rounded-xl p-3">
                    <p className="text-xs text-base-content/50">ROI</p>
                    <p
                      className={`text-xl font-bold tabular-nums mt-1 ${
                        r.roiPct >= 0 ? 'text-primary' : 'text-error'
                      }`}
                    >
                      {r.roiPct >= 0 ? '+' : ''}
                      {r.roiPct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-base-300 rounded-xl p-3">
                    <p className="text-xs text-base-content/50">Breakeven</p>
                    <p className="text-xl font-bold tabular-nums mt-1">
                      {isFinite(r.breakevenQty) ? `${r.breakevenQty} ta` : '∞'}
                    </p>
                  </div>
                </div>

                {/* Cost breakdown */}
                <div className="bg-base-300 rounded-xl p-3 space-y-2 text-xs">
                  <p className="font-semibold text-base-content/60 mb-2">Xarajatlar (1 dona)</p>
                  <div className="flex justify-between">
                    <span className="text-base-content/50">Xarid narxi</span>
                    <span className="tabular-nums">{Math.round(r.buyPriceUzs).toLocaleString()} so'm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/50">
                      Komissiya ({inputs.commission_pct}%)
                    </span>
                    <span className="tabular-nums">
                      {Math.round(r.commissionAmount).toLocaleString()} so'm
                    </span>
                  </div>
                  {Number(inputs.fbo_cost) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-base-content/50">FBO</span>
                      <span className="tabular-nums">
                        {Number(inputs.fbo_cost).toLocaleString()} so'm
                      </span>
                    </div>
                  )}
                  {Number(inputs.ad_cost) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Reklama</span>
                      <span className="tabular-nums">
                        {Number(inputs.ad_cost).toLocaleString()} so'm
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-base-content/10 pt-2 font-semibold">
                    <span>Jami xarajat</span>
                    <span className="tabular-nums">
                      {Math.round(r.totalCostPerUnit).toLocaleString()} so'm
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Foyda / dona</span>
                    <span
                      className={`tabular-nums ${
                        r.profitPerUnit >= 0 ? 'text-success' : 'text-error'
                      }`}
                    >
                      {r.profitPerUnit >= 0 ? '+' : ''}
                      {Math.round(r.profitPerUnit).toLocaleString()} so'm
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Breakeven Chart ── */}
      {hasResult && isFinite(r.breakevenQty) && r.chartData.length > 1 && (
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body gap-2">
            <div>
              <h2 className="font-semibold text-sm text-base-content/70">
                Breakeven tahlili
              </h2>
              <p className="text-xs text-base-content/40 mt-0.5">
                Sotilgan dona soni vs pul oqimi — qizil chiziq breakeven nuqtasi
              </p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={r.chartData} margin={{ top: 8, right: 16, left: -8, bottom: 16 }}>
                <defs>
                  <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="units"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: 'Sotilgan dona',
                    position: 'insideBottom',
                    offset: -8,
                    fontSize: 10,
                    fill: 'rgba(255,255,255,0.3)',
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : `${(v / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: '#1d232a',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v.toLocaleString()} so'm`, 'Pul oqimi']}
                  labelFormatter={(l: number) => `${l} ta sotildi`}
                />
                {/* Zero line */}
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
                {/* Breakeven line */}
                {r.breakevenQty > 0 && (
                  <ReferenceLine
                    x={r.breakevenQty}
                    stroke="#ef4444"
                    strokeDasharray="4 2"
                    label={{
                      value: `Breakeven: ${r.breakevenQty} ta`,
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#ef4444',
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="cashFlow"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#cfGrad)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
