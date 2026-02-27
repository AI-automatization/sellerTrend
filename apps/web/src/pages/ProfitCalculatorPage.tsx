import { useState } from 'react';
import { toolsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useI18n } from '../i18n/I18nContext';

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
  const { t } = useI18n();
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
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 lg:w-7 lg:h-7 text-accent">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75V18m15-8.25l-8.25 4.5m0 0l-8.25-4.5M21 9.75v4.5m0 0l-8.25 4.5m0 0l-8.25-4.5" />
          </svg>
          {t('calculator.title')}
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          {t('calculator.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body">
            <h2 className="card-title text-base">{t('calculator.params')}</h2>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">{t('calculator.sellPrice')}</legend>
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
                  <legend className="fieldset-legend text-xs">{t('calculator.unitCost')}</legend>
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
                  <legend className="fieldset-legend text-xs">{t('calculator.usdRate')}</legend>
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
                  <legend className="fieldset-legend text-xs">{t('calculator.commission')}</legend>
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
                  <legend className="fieldset-legend text-xs">{t('calculator.fboCost')}</legend>
                  <input
                    type="number"
                    value={form.fbo_cost_uzs}
                    onChange={(e) => set('fbo_cost_uzs', e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Ixtiyoriy"
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">{t('calculator.adsCost')}</legend>
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
                <legend className="fieldset-legend text-xs">{t('calculator.quantity')}</legend>
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
                {loading ? t('common.calculating') : t('common.calculate')}
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
                  <div className="stat-title text-xs">{t('calculator.netProfit')}</div>
                  <div className={`stat-value text-xl ${result.net_profit > 0 ? 'text-success' : 'text-error'}`}>
                    {formatNum(result.net_profit)}
                  </div>
                  <div className="stat-desc">so'm</div>
                </div>
                <div className="stat bg-base-200/60 border border-base-300/50 rounded-2xl">
                  <div className="stat-title text-xs">{t('calculator.margin')}</div>
                  <div className={`stat-value text-xl ${result.margin_pct > 20 ? 'text-success' : result.margin_pct > 0 ? 'text-warning' : 'text-error'}`}>
                    {result.margin_pct.toFixed(1)}%
                  </div>
                  <div className="stat-desc">{t('calculator.netMargin')}</div>
                </div>
                <div className="stat bg-base-200/60 border border-base-300/50 rounded-2xl">
                  <div className="stat-title text-xs">{t('calculator.roi')}</div>
                  <div className={`stat-value text-xl ${result.roi_pct > 50 ? 'text-success' : result.roi_pct > 0 ? 'text-warning' : 'text-error'}`}>
                    {result.roi_pct.toFixed(1)}%
                  </div>
                  <div className="stat-desc">{t('calculator.profitability')}</div>
                </div>
                <div className="stat bg-base-200/60 border border-base-300/50 rounded-2xl">
                  <div className="stat-title text-xs">{t('calculator.revenue')}</div>
                  <div className="stat-value text-xl">{formatNum(result.revenue)}</div>
                  <div className="stat-desc">so'm</div>
                </div>
              </div>

              {/* Detail card */}
              <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
                <div className="card-body p-4">
                  <h3 className="font-bold text-sm">{t('common.details')}</h3>
                  <div className="space-y-2 mt-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-base-content/50">{t('calculator.revenue')}</span>
                      <span className="font-medium tabular-nums">{formatNum(result.revenue)} so'm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/50">{t('calculator.totalCost')}</span>
                      <span className="font-medium tabular-nums text-error">{formatNum(result.total_cost)} so'm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/50">{t('calculator.grossProfit')}</span>
                      <span className="font-medium tabular-nums">{formatNum(result.gross_profit)} so'm</span>
                    </div>
                    <div className="divider my-1" />
                    <div className="flex justify-between font-bold">
                      <span>{t('calculator.netProfit')}</span>
                      <span className={result.net_profit > 0 ? 'text-success' : 'text-error'}>
                        {formatNum(result.net_profit)} so'm
                      </span>
                    </div>
                    <div className="divider my-1" />
                    <div className="flex justify-between">
                      <span className="text-base-content/50">{t('calculator.breakevenQty')}</span>
                      <span className="font-medium tabular-nums">{Math.ceil(result.breakeven_qty)} {t('calculator.pieces')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/50">{t('calculator.breakevenPrice')}</span>
                      <span className="font-medium tabular-nums">{formatNum(result.breakeven_price)} so'm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verdict */}
              <div className={`alert ${result.margin_pct >= 20 ? 'alert-success' : result.margin_pct >= 10 ? 'alert-warning' : 'alert-error'}`}>
                <span className="text-sm">
                  {result.margin_pct >= 20
                    ? t('calculator.goodMargin')
                    : result.margin_pct >= 10
                    ? t('calculator.avgMargin')
                    : t('calculator.lowMargin')}
                </span>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
              <div className="card-body items-center py-16 text-base-content/40">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75V18m15-8.25l-8.25 4.5m0 0l-8.25-4.5M21 9.75v4.5m0 0l-8.25 4.5m0 0l-8.25-4.5" />
                </svg>
                <p>{t('calculator.inputHint')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
