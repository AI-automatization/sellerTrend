import { useState, useEffect, useRef } from 'react';
import { sourcingApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { fmtUSD, fmtUZS } from './types';
import type { CargoProvider, CurrencyRates, CalcResult } from './types';
import { ResultCard } from './ResultCard';
import { useI18n } from '../../i18n/I18nContext';
import {
  RiBox3Line,
  RiWeightLine,
  RiMoneyDollarCircleLine,
  RiPriceTag3Line,
  RiTruckLine,
  RiPlaneLine,
  RiShipLine,
  RiTrainLine,
  RiCalculatorLine,
  RiInformationLine,
  RiArrowDownSLine,
  RiCheckLine,
} from 'react-icons/ri';

export interface CargoCalculatorProps {
  providers: CargoProvider[];
  rates: CurrencyRates | null;
  ratesLoading?: boolean;
  prefillName?: string;
  prefillItemCostUzs?: number;
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  AVIA:   <RiPlaneLine size={14} />,
  CARGO:  <RiShipLine size={14} />,
  RAIL:   <RiTrainLine size={14} />,
  AUTO:   <RiTruckLine size={14} />,
  TURKEY: <RiTruckLine size={14} />,
};

export function CargoCalculator({
  providers, rates, ratesLoading, prefillName, prefillItemCostUzs,
}: CargoCalculatorProps) {
  const { t } = useI18n();
  const DEFAULT_USD_RATE = 12900;
  const usdRate = rates?.USD ?? DEFAULT_USD_RATE;

  const [form, setForm] = useState({
    item_name: prefillName ?? '',
    item_cost_usd: prefillItemCostUzs ? (prefillItemCostUzs / usdRate).toFixed(2) : '',
    weight_kg: '',
    quantity: '1',
    provider_id: '',
    customs_rate: '10',
    sell_price_uzs: '',
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [providerOpen, setProviderOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProviderOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    const qty = parseInt(form.quantity || '1');
    const itemCost = parseFloat(form.item_cost_usd) * qty;
    const cargo = parseFloat(form.weight_kg) * selectedProvider.rate_per_kg;
    const cr = parseFloat(form.customs_rate) / 100;
    const customs = (itemCost + cargo) * cr;
    const vat = (itemCost + cargo + customs) * 0.12;
    const landed = itemCost + cargo + customs + vat;
    return { landed, landedUzs: landed * rates.USD };
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.provider_id) {
      setError(t('sourcing.calc.routeSelectError'));
      return;
    }
    const costVal = parseFloat(form.item_cost_usd);
    const weightVal = parseFloat(form.weight_kg);
    if (isNaN(costVal) || costVal <= 0) {
      setError(t('sourcing.calc.itemCostLabel') + ' — kiriting');
      return;
    }
    if (isNaN(weightVal) || weightVal <= 0) {
      setError(t('sourcing.calc.weightLabel') + ' — kiriting');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await sourcingApi.calculateCargo({
        item_name: form.item_name || undefined,
        item_cost_usd: costVal,
        weight_kg: weightVal,
        quantity: parseInt(form.quantity) || 1,
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

  const inputClass = 'input input-bordered w-full';
  const labelClass = 'text-xs font-medium text-base-content/60 mb-1.5 block';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Form ── */}
      <div className="card bg-base-100 border border-base-300/60 shadow-sm overflow-visible">
        <div className="card-body gap-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <RiCalculatorLine size={16} />
            </div>
            <h2 className="font-semibold">{t('sourcing.calc.title')}</h2>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Mahsulot nomi */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <RiBox3Line size={13} />
                  {t('sourcing.calc.itemNameLabel')}
                </span>
              </label>
              <input
                type="text"
                placeholder="Masalan: Samsung Galaxy S24"
                className={inputClass}
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              />
            </div>

            {/* Narx + Miqdor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1.5">
                    <RiMoneyDollarCircleLine size={13} />
                    {t('sourcing.calc.itemCostLabel')}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-sm font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="15.50"
                    className={`${inputClass} pl-6`}
                    value={form.item_cost_usd}
                    onChange={(e) => setForm({ ...form, item_cost_usd: e.target.value })}
                    required
                  />
                </div>
                {form.item_cost_usd && rates && (
                  <p className="text-xs text-base-content/40 mt-1">
                    ≈ {fmtUZS(parseFloat(form.item_cost_usd) * rates.USD)}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>{t('sourcing.calc.quantityLabel')}</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  className={inputClass}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Og'irlik */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <RiWeightLine size={13} />
                  {t('sourcing.calc.weightLabel')}
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="2.5"
                  className={`${inputClass} pr-10`}
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 text-xs">kg</span>
              </div>
            </div>

            {/* Yo'nalish */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <RiTruckLine size={13} />
                  {t('sourcing.calc.routeLabel')}
                </span>
              </label>

              {providers.length === 0 && !ratesLoading ? (
                <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                  <RiInformationLine size={14} />
                  <span>Cargo provayderlar topilmadi. Admin panelda qo'shing.</span>
                </div>
              ) : (
                <div ref={dropdownRef} className="relative">
                  {/* Trigger */}
                  <button
                    type="button"
                    onClick={() => setProviderOpen((v) => !v)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border bg-base-100 text-sm transition-all ${
                      providerOpen
                        ? 'border-primary/50 ring-1 ring-primary/20'
                        : 'border-base-300 hover:border-base-content/30'
                    }`}
                  >
                    {selectedProvider ? (
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-base-content/50 shrink-0">{METHOD_ICONS[selectedProvider.method]}</span>
                        <span className="font-medium truncate">{selectedProvider.name}</span>
                        <span className="text-base-content/30 shrink-0">·</span>
                        <span className="font-mono text-xs text-base-content/60 shrink-0">${selectedProvider.rate_per_kg}/kg</span>
                        <span className="text-base-content/30 shrink-0">·</span>
                        <span className="text-xs text-base-content/50 shrink-0">{selectedProvider.delivery_days} kun</span>
                        {selectedProvider.min_weight_kg && (
                          <span className="text-xs text-base-content/30 shrink-0">· min {selectedProvider.min_weight_kg}kg</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-base-content/40">{t('sourcing.calc.routeLabel')}</span>
                    )}
                    <RiArrowDownSLine
                      size={16}
                      className={`shrink-0 text-base-content/40 transition-transform ${providerOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown panel */}
                  {providerOpen && (
                    <div className="absolute z-20 bottom-full left-0 right-0 mb-1 bg-base-100 border border-base-300 rounded-xl shadow-lg overflow-y-auto max-h-64">
                      {cnProviders.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/40 bg-base-200/60">
                            🇨🇳 {t('sourcing.calc.originCN')}
                          </div>
                          {cnProviders.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { setForm({ ...form, provider_id: p.id }); setProviderOpen(false); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-base-200/60 transition-colors ${
                                form.provider_id === p.id ? 'bg-primary/6' : ''
                              }`}
                            >
                              <span className="text-base-content/50 shrink-0">{METHOD_ICONS[p.method]}</span>
                              <span className="flex-1 text-left font-medium">{p.name}</span>
                              <span className="font-mono text-xs text-base-content/60">${p.rate_per_kg}/kg</span>
                              <span className="text-xs text-base-content/40">{p.delivery_days} kun</span>
                              {p.min_weight_kg && <span className="text-xs text-base-content/30">min {p.min_weight_kg}kg</span>}
                              {form.provider_id === p.id && <RiCheckLine size={13} className="text-primary shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                      {euProviders.length > 0 && (
                        <div className="border-t border-base-300/50">
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/40 bg-base-200/60">
                            🇪🇺 {t('sourcing.calc.originEU')}
                          </div>
                          {euProviders.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { setForm({ ...form, provider_id: p.id }); setProviderOpen(false); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-base-200/60 transition-colors ${
                                form.provider_id === p.id ? 'bg-primary/6' : ''
                              }`}
                            >
                              <span className="text-base-content/50 shrink-0">{METHOD_ICONS[p.method]}</span>
                              <span className="flex-1 text-left font-medium">{p.name}</span>
                              <span className="font-mono text-xs text-base-content/60">${p.rate_per_kg}/kg</span>
                              <span className="text-xs text-base-content/40">{p.delivery_days} kun</span>
                              {form.provider_id === p.id && <RiCheckLine size={13} className="text-primary shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bojxona + Sotish narxi */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('sourcing.calc.customsLabel')}</label>
                <select
                  className="select select-bordered w-full"
                  value={form.customs_rate}
                  onChange={(e) => setForm({ ...form, customs_rate: e.target.value })}
                >
                  <option value="0">{t('sourcing.calc.customs0')}</option>
                  <option value="10">{t('sourcing.calc.customs10')}</option>
                  <option value="20">{t('sourcing.calc.customs20')}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1.5 justify-between">
                    <span className="flex items-center gap-1">
                      <RiPriceTag3Line size={13} />
                      {t('sourcing.calc.sellPriceLabel')}
                    </span>
                    <span className="text-base-content/30 font-normal">{t('sourcing.calc.sellPriceOptional')}</span>
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="150 000"
                  className={inputClass}
                  value={form.sell_price_uzs}
                  onChange={(e) => setForm({ ...form, sell_price_uzs: e.target.value })}
                />
              </div>
            </div>

            {/* Live preview */}
            {preview && (
              <div className="flex items-center justify-between bg-primary/8 border border-primary/20 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-base-content/50">{t('sourcing.calc.previewLabel')}</p>
                  <p className="font-bold text-primary mt-0.5">{fmtUZS(preview.landedUzs)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-base-content/40">per unit</p>
                  <p className="text-sm font-mono text-base-content/60">{fmtUSD(preview.landed)}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-error text-sm bg-error/10 border border-error/20 rounded-lg px-3 py-2">
                <RiInformationLine size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || providers.length === 0}
            >
              {loading
                ? <><span className="loading loading-spinner loading-sm" /> {t('analyze.analyzing')}</>
                : <><RiCalculatorLine size={16} /> {t('sourcing.calc.calculateBtn')}</>
              }
            </button>
          </form>
        </div>
      </div>

      {/* ── Result ── */}
      {result ? (
        <ResultCard result={result} />
      ) : (
        <div className="card bg-base-200/40 border border-dashed border-base-300/60">
          <div className="card-body items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-base-300/60 flex items-center justify-center mb-3">
              <RiBox3Line size={24} className="text-base-content/30" />
            </div>
            <p className="text-base-content/40 text-sm">{t('sourcing.calc.resultPlaceholder')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
