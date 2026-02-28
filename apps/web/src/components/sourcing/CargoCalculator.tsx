import { useState, useEffect } from 'react';
import { sourcingApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { METHOD_ICONS, fmtUSD, fmtUZS } from './types';
import type { CargoProvider, CurrencyRates, CalcResult } from './types';
import { ResultCard } from './ResultCard';
import { useI18n } from '../../i18n/I18nContext';

export interface CargoCalculatorProps {
  providers: CargoProvider[];
  rates: CurrencyRates | null;
  prefillName?: string;
  prefillItemCostUzs?: number;
}

export function CargoCalculator({
  providers, rates, prefillName, prefillItemCostUzs,
}: CargoCalculatorProps) {
  const { t } = useI18n();
  const usdRate = rates?.USD ?? 12900;
  const [form, setForm] = useState({
    item_name: prefillName ?? '',
    item_cost_usd: prefillItemCostUzs ? (prefillItemCostUzs / usdRate).toFixed(2) : '',
    weight_kg: '', quantity: '1', provider_id: '', customs_rate: '10', sell_price_uzs: '',
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cnProviders = providers.filter((p) => p.origin === 'CN');
  const euProviders = providers.filter((p) => p.origin === 'EU');

  useEffect(() => {
    if (providers.length > 0 && !form.provider_id) {
      setForm((f) => ({ ...f, provider_id: providers[0].id }));
    }
  }, [providers]);

  const selectedProvider = providers.find((p) => p.id === form.provider_id);
  const preview = (() => {
    if (!rates || !selectedProvider || !form.item_cost_usd || !form.weight_kg) return null;
    const itemCost = parseFloat(form.item_cost_usd) * parseInt(form.quantity || '1');
    const cargo = parseFloat(form.weight_kg) * selectedProvider.rate_per_kg;
    const cr = parseFloat(form.customs_rate) / 100;
    const customs = (itemCost + cargo) * cr;
    const vat = (itemCost + cargo + customs) * 0.12;
    const landed = itemCost + cargo + customs + vat;
    return { landed, landedUzs: landed * rates.USD };
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.provider_id) { setError(t('sourcing.calc.routeSelectError')); return; }
    setLoading(true); setError('');
    try {
      const r = await sourcingApi.calculateCargo({
        item_name: form.item_name || undefined,
        item_cost_usd: parseFloat(form.item_cost_usd),
        weight_kg: parseFloat(form.weight_kg),
        quantity: parseInt(form.quantity),
        provider_id: form.provider_id,
        customs_rate: parseFloat(form.customs_rate) / 100,
        sell_price_uzs: form.sell_price_uzs ? parseFloat(form.sell_price_uzs) : undefined,
      });
      setResult(r.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl">
        <div className="card-body">
          <h2 className="card-title text-lg">{t('sourcing.calc.title')}</h2>
          <form onSubmit={submit} className="space-y-4 mt-2">
            <div className="form-control">
              <label className="label"><span className="label-text">{t('sourcing.calc.itemNameLabel')}</span></label>
              <input type="text" placeholder="Masalan: Samsung Galaxy S24"
                className="input input-bordered input-sm" value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">{t('sourcing.calc.itemCostLabel')}</span></label>
                <input type="number" step="0.01" min="0.01" placeholder="15.50"
                  className="input input-bordered input-sm" value={form.item_cost_usd}
                  onChange={(e) => setForm({ ...form, item_cost_usd: e.target.value })} required />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('sourcing.calc.quantityLabel')}</span></label>
                <input type="number" min="1" placeholder="1"
                  className="input input-bordered input-sm" value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">{t('sourcing.calc.weightLabel')}</span></label>
              <input type="number" step="0.1" min="0.1" placeholder="2.5"
                className="input input-bordered input-sm" value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} required />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">{t('sourcing.calc.routeLabel')}</span></label>
              {cnProviders.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-base-content/40 mb-1">🇨🇳 {t('sourcing.calc.originCN')}</p>
                  {cnProviders.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-300 transition-colors">
                      <input type="radio" name="provider" className="radio radio-sm radio-primary"
                        value={p.id} checked={form.provider_id === p.id}
                        onChange={() => setForm({ ...form, provider_id: p.id })} />
                      <span className="flex-1 text-sm">{METHOD_ICONS[p.method]} {p.name}</span>
                      <span className="text-xs text-base-content/50">
                        ${p.rate_per_kg}/kg · {t('sourcing.result.deliveryDays').replace('{n}', String(p.delivery_days))}
                        {p.min_weight_kg ? ` · min ${p.min_weight_kg}kg` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {euProviders.length > 0 && (
                <div>
                  <p className="text-xs text-base-content/40 mb-1">🇪🇺 {t('sourcing.calc.originEU')}</p>
                  {euProviders.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-300 transition-colors">
                      <input type="radio" name="provider" className="radio radio-sm radio-secondary"
                        value={p.id} checked={form.provider_id === p.id}
                        onChange={() => setForm({ ...form, provider_id: p.id })} />
                      <span className="flex-1 text-sm">{METHOD_ICONS[p.method]} {p.name}</span>
                      <span className="text-xs text-base-content/50">${p.rate_per_kg}/kg · {t('sourcing.result.deliveryDays').replace('{n}', String(p.delivery_days))}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">{t('sourcing.calc.customsLabel')}</span></label>
                <select className="select select-bordered select-sm" value={form.customs_rate}
                  onChange={(e) => setForm({ ...form, customs_rate: e.target.value })}>
                  <option value="0">{t('sourcing.calc.customs0')}</option>
                  <option value="10">{t('sourcing.calc.customs10')}</option>
                  <option value="20">{t('sourcing.calc.customs20')}</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('sourcing.calc.sellPriceLabel')}</span>
                  <span className="label-text-alt text-base-content/40">{t('sourcing.calc.sellPriceOptional')}</span>
                </label>
                <input type="number" min="0" placeholder="150000"
                  className="input input-bordered input-sm" value={form.sell_price_uzs}
                  onChange={(e) => setForm({ ...form, sell_price_uzs: e.target.value })} />
              </div>
            </div>

            {preview && (
              <div className="bg-base-300 rounded-lg px-4 py-3 text-sm">
                <span className="text-base-content/50">{t('sourcing.calc.previewLabel')} </span>
                <span className="font-bold text-primary">{fmtUZS(preview.landedUzs)}</span>
                <span className="text-base-content/40 ml-2">≈ {fmtUSD(preview.landed)}</span>
              </div>
            )}

            {error && <p className="text-error text-sm">{error}</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : `🧮 ${t('sourcing.calc.calculateBtn')}`}
            </button>
          </form>
        </div>
      </div>

      {result ? <ResultCard result={result} /> : (
        <div className="card bg-base-200 opacity-40">
          <div className="card-body items-center justify-center py-24">
            <div className="text-6xl mb-3">📦</div>
            <p className="text-base-content/60">{t('sourcing.calc.resultPlaceholder')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
