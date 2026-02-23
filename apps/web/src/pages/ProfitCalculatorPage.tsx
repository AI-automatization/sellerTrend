import { useState } from 'react';
import { toolsApi } from '../api/client';

interface ProfitResult {
  revenue: number;
  total_cost: number;
  gross_profit: number;
  net_profit: number;
  margin_pct: number;
  roi_pct: number;
  breakeven_qty: number;
  breakeven_price: number;
}

const DEFAULT_FORM = {
  sell_price_uzs: '',
  unit_cost_usd: '',
  usd_to_uzs: '12800',
  uzum_commission_pct: '10',
  fbo_cost_uzs: '',
  ads_spend_uzs: '',
  quantity: '100',
};

function formatNum(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function ProfitCalculatorPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState<ProfitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await toolsApi.calculateProfit({
        sell_price_uzs: Number(form.sell_price_uzs),
        unit_cost_usd: Number(form.unit_cost_usd),
        usd_to_uzs: Number(form.usd_to_uzs),
        uzum_commission_pct: Number(form.uzum_commission_pct),
        fbo_cost_uzs: form.fbo_cost_uzs ? Number(form.fbo_cost_uzs) : undefined,
        ads_spend_uzs: form.ads_spend_uzs ? Number(form.ads_spend_uzs) : undefined,
        quantity: Number(form.quantity),
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75V18m15-8.25l-8.25 4.5m0 0l-8.25-4.5M21 9.75v4.5m0 0l-8.25 4.5m0 0l-8.25-4.5" />
          </svg>
          Profit Kalkulyator
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          Uzum'da sotish uchun foyda, margin va ROI hisoblang
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base">Parametrlar</h2>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">Sotish narxi (so'm)</legend>
                  <input
                    type="number"
                    value={form.sell_price_uzs}
                    onChange={(e) => set('sell_price_uzs', e.target.value)}
                    required
                    min={1}
                    className="input input-bordered w-full"
                    placeholder="100 000"
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">Xarid narxi (USD)</legend>
                  <input
                    type="number"
                    value={form.unit_cost_usd}
                    onChange={(e) => set('unit_cost_usd', e.target.value)}
                    required
                    min={0.01}
                    step="0.01"
                    className="input input-bordered w-full"
                    placeholder="5.00"
                  />
                </fieldset>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">USD kursi (so'm)</legend>
                  <input
                    type="number"
                    value={form.usd_to_uzs}
                    onChange={(e) => set('usd_to_uzs', e.target.value)}
                    required
                    min={1}
                    className="input input-bordered w-full"
                    placeholder="12800"
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">Uzum komissiya (%)</legend>
                  <input
                    type="number"
                    value={form.uzum_commission_pct}
                    onChange={(e) => set('uzum_commission_pct', e.target.value)}
                    required
                    min={0}
                    max={100}
                    className="input input-bordered w-full"
                    placeholder="10"
                  />
                </fieldset>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">FBO xarajat (so'm)</legend>
                  <input
                    type="number"
                    value={form.fbo_cost_uzs}
                    onChange={(e) => set('fbo_cost_uzs', e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Ixtiyoriy"
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">Reklama xarajat (so'm)</legend>
                  <input
                    type="number"
                    value={form.ads_spend_uzs}
                    onChange={(e) => set('ads_spend_uzs', e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Ixtiyoriy"
                  />
                </fieldset>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Soni (dona)</legend>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  required
                  min={1}
                  className="input input-bordered w-full"
                  placeholder="100"
                />
              </fieldset>

              {error && <p className="text-error text-sm">{error}</p>}

              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading && <span className="loading loading-spinner loading-sm" />}
                {loading ? 'Hisoblanmoqda...' : 'Hisoblash'}
              </button>
            </form>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Main stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`stat bg-base-200 rounded-2xl ${result.net_profit > 0 ? '' : 'border border-error/30'}`}>
                  <div className="stat-title text-xs">Sof foyda</div>
                  <div className={`stat-value text-xl ${result.net_profit > 0 ? 'text-success' : 'text-error'}`}>
                    {formatNum(result.net_profit)}
                  </div>
                  <div className="stat-desc">so'm</div>
                </div>
                <div className="stat bg-base-200 rounded-2xl">
                  <div className="stat-title text-xs">Margin</div>
                  <div className={`stat-value text-xl ${result.margin_pct > 20 ? 'text-success' : result.margin_pct > 0 ? 'text-warning' : 'text-error'}`}>
                    {result.margin_pct.toFixed(1)}%
                  </div>
                  <div className="stat-desc">sof margin</div>
                </div>
                <div className="stat bg-base-200 rounded-2xl">
                  <div className="stat-title text-xs">ROI</div>
                  <div className={`stat-value text-xl ${result.roi_pct > 50 ? 'text-success' : result.roi_pct > 0 ? 'text-warning' : 'text-error'}`}>
                    {result.roi_pct.toFixed(1)}%
                  </div>
                  <div className="stat-desc">rentabellik</div>
                </div>
                <div className="stat bg-base-200 rounded-2xl">
                  <div className="stat-title text-xs">Daromad</div>
                  <div className="stat-value text-xl">{formatNum(result.revenue)}</div>
                  <div className="stat-desc">so'm</div>
                </div>
              </div>

              {/* Detail card */}
              <div className="card bg-base-200 shadow-sm">
                <div className="card-body p-4">
                  <h3 className="font-bold text-sm">Batafsil</h3>
                  <div className="space-y-2 mt-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Daromad</span>
                      <span className="font-medium tabular-nums">{formatNum(result.revenue)} so'm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Jami xarajat</span>
                      <span className="font-medium tabular-nums text-error">{formatNum(result.total_cost)} so'm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Yalpi foyda</span>
                      <span className="font-medium tabular-nums">{formatNum(result.gross_profit)} so'm</span>
                    </div>
                    <div className="divider my-1" />
                    <div className="flex justify-between font-bold">
                      <span>Sof foyda</span>
                      <span className={result.net_profit > 0 ? 'text-success' : 'text-error'}>
                        {formatNum(result.net_profit)} so'm
                      </span>
                    </div>
                    <div className="divider my-1" />
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Zararsizlik soni</span>
                      <span className="font-medium tabular-nums">{Math.ceil(result.breakeven_qty)} dona</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Zararsizlik narxi</span>
                      <span className="font-medium tabular-nums">{formatNum(result.breakeven_price)} so'm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verdict */}
              <div className={`alert ${result.margin_pct >= 20 ? 'alert-success' : result.margin_pct >= 10 ? 'alert-warning' : 'alert-error'}`}>
                <span className="text-sm">
                  {result.margin_pct >= 20
                    ? "Yaxshi margin! Bu mahsulot foydali ko'rinadi."
                    : result.margin_pct >= 10
                    ? "O'rtacha margin. Xarajatlarni optimallashtirish kerak."
                    : "Past margin yoki zarar. Narx siyosatini qayta ko'ring."}
                </span>
              </div>
            </>
          ) : (
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body items-center py-16 text-base-content/40">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75V18m15-8.25l-8.25 4.5m0 0l-8.25-4.5M21 9.75v4.5m0 0l-8.25 4.5m0 0l-8.25-4.5" />
                </svg>
                <p>Parametrlarni kiriting va "Hisoblash" tugmasini bosing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
