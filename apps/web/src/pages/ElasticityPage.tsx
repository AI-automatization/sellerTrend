import { useState } from 'react';
import { toolsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useI18n } from '../i18n/I18nContext';

interface ElasticityResult {
  elasticity: number;
  type: 'elastic' | 'inelastic' | 'unitary';
  revenue_old: number;
  revenue_new: number;
  revenue_change_pct: number;
  optimal_direction: 'raise' | 'lower' | 'keep';
  interpretation: string;
}

const DEFAULT_FORM = {
  price_old: '',
  price_new: '',
  qty_old: '',
  qty_new: '',
};

function formatNum(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function ElasticityPage() {
  const { t } = useI18n();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState<ElasticityResult | null>(null);
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
      const res = await toolsApi.calculateElasticity({
        price_old: Number(form.price_old),
        price_new: Number(form.price_new),
        qty_old: Number(form.qty_old),
        qty_new: Number(form.qty_new),
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
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 lg:w-7 lg:h-7 text-warning">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          {t('elasticity.title')}
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          {t('elasticity.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body">
            <h2 className="card-title text-base">{t('elasticity.data')}</h2>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">{t('elasticity.oldPrice')}</legend>
                  <input
                    type="number"
                    value={form.price_old}
                    onChange={(e) => set('price_old', e.target.value)}
                    required min={1}
                    className="input input-bordered w-full"
                    placeholder="100 000"
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">{t('elasticity.newPrice')}</legend>
                  <input
                    type="number"
                    value={form.price_new}
                    onChange={(e) => set('price_new', e.target.value)}
                    required min={1}
                    className="input input-bordered w-full"
                    placeholder="90 000"
                  />
                </fieldset>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">{t('elasticity.oldSales')}</legend>
                  <input
                    type="number"
                    value={form.qty_old}
                    onChange={(e) => set('qty_old', e.target.value)}
                    required min={1}
                    className="input input-bordered w-full"
                    placeholder="50"
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">{t('elasticity.newSales')}</legend>
                  <input
                    type="number"
                    value={form.qty_new}
                    onChange={(e) => set('qty_new', e.target.value)}
                    required min={0}
                    className="input input-bordered w-full"
                    placeholder="65"
                  />
                </fieldset>
              </div>

              {error && <p className="text-error text-sm">{error}</p>}

              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading && <span className="loading loading-spinner loading-sm" />}
                {loading ? t('common.calculating') : t('common.calculate')}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="stat bg-base-200/60 border border-base-300/50 rounded-2xl">
                  <div className="stat-title text-xs">{t('elasticity.value')}</div>
                  <div className={`stat-value text-xl ${result.type === 'elastic' ? 'text-info' : result.type === 'inelastic' ? 'text-warning' : ''}`}>
                    {result.elasticity}
                  </div>
                  <div className="stat-desc">
                    {result.type === 'elastic' ? t('elasticity.elastic') : result.type === 'inelastic' ? t('elasticity.inelastic') : t('elasticity.unitary')}
                  </div>
                </div>
                <div className="stat bg-base-200/60 border border-base-300/50 rounded-2xl">
                  <div className="stat-title text-xs">{t('elasticity.revenueChange')}</div>
                  <div className={`stat-value text-xl ${result.revenue_change_pct > 0 ? 'text-success' : result.revenue_change_pct < 0 ? 'text-error' : ''}`}>
                    {result.revenue_change_pct > 0 ? '+' : ''}{result.revenue_change_pct}%
                  </div>
                  <div className="stat-desc">
                    {formatNum(result.revenue_old)} → {formatNum(result.revenue_new)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
                <div className="card-body p-4">
                  <h3 className="font-bold text-sm">{t('common.details')}</h3>
                  <div className="space-y-2 mt-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-base-content/50">{t('elasticity.oldRevenue')}</span>
                      <span className="font-medium tabular-nums">{formatNum(result.revenue_old)} so'm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/50">{t('elasticity.newRevenue')}</span>
                      <span className="font-medium tabular-nums">{formatNum(result.revenue_new)} so'm</span>
                    </div>
                    <div className="divider my-1" />
                    <div className="flex justify-between">
                      <span className="text-base-content/50">{t('elasticity.recommendation')}</span>
                      <span className={`font-bold ${result.optimal_direction === 'raise' ? 'text-success' : result.optimal_direction === 'lower' ? 'text-info' : 'text-warning'}`}>
                        {result.optimal_direction === 'raise' ? t('elasticity.raise') : result.optimal_direction === 'lower' ? t('elasticity.lower') : t('elasticity.keep')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`alert ${result.type === 'elastic' ? 'alert-info' : result.type === 'inelastic' ? 'alert-warning' : 'alert-success'}`}>
                <span className="text-sm">{result.interpretation}</span>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
              <div className="card-body items-center py-16 text-base-content/40">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                </svg>
                <p>{t('elasticity.inputHint')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
