import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError, toastError } from '../../utils/handleError';
import { useI18n } from '../../i18n/I18nContext';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { PriceTestItem } from './types';

export function PriceTestTab() {
  const { t } = useI18n();
  const [tests, setTests] = useState<PriceTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ product_id: '', original_price: '', test_price: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    signalsApi.listPriceTests()
      .then((r) => setTests(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  function createTest() {
    if (!form.product_id || !form.original_price || !form.test_price) return;
    setCreating(true);
    signalsApi.createPriceTest({
      product_id: form.product_id,
      original_price: Number(form.original_price),
      test_price: Number(form.test_price),
    })
      .then((r: { data: PriceTestItem }) => {
        setTests([{ ...r.data, product_title: `Product #${form.product_id}` }, ...tests]);
        setForm({ product_id: '', original_price: '', test_price: '' });
      })
      .catch((e) => toastError(e))
      .finally(() => setCreating(false));
  }

  function updateStatus(id: string, status: string) {
    signalsApi.updatePriceTest(id, { status })
      .then(() => {
        setTests(tests.map((t) => t.id === id ? { ...t, status } : t));
      })
      .catch((e) => toastError(e));
  }

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  const statusColor = (s: string) =>
    s === 'COMPLETED' ? 'badge-success' : s === 'RUNNING' ? 'badge-warning' :
    s === 'CANCELLED' ? 'badge-error' : 'badge-ghost';

  return (
    <SectionCard>
      <SectionHeader
        title={t('signals.price.title')}
        desc={t('signals.price.desc')}
      />

      {/* Create form */}
      <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-6">
        <p className="text-xs text-base-content/50 mb-3">{t('signals.price.newTestLabel')}</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            className="input input-bordered input-sm w-36"
            placeholder={t('signals.price.placeholder')}
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
          />
          <input
            type="number"
            className="input input-bordered input-sm w-36"
            placeholder={t('signals.price.originalPlaceholder')}
            value={form.original_price}
            onChange={(e) => setForm({ ...form, original_price: e.target.value })}
          />
          <input
            type="number"
            className="input input-bordered input-sm w-36"
            placeholder={t('signals.price.testPlaceholder')}
            value={form.test_price}
            onChange={(e) => setForm({ ...form, test_price: e.target.value })}
          />
          <button className="btn btn-primary btn-sm" onClick={createTest} disabled={creating}>
            {creating ? <span className="loading loading-spinner loading-xs" /> : t('signals.price.createBtn')}
          </button>
        </div>
      </div>

      {tests.length === 0 ? (
        <EmptyState text={t('signals.price.empty')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>{t('signals.price.col.product')}</th>
                <th className="text-right">{t('signals.price.col.originalPrice')}</th>
                <th className="text-right">{t('signals.price.col.testPrice')}</th>
                <th className="text-center">{t('signals.price.col.status')}</th>
                <th className="text-right">{t('signals.price.col.originalSales')}</th>
                <th className="text-right">{t('signals.price.col.testSales')}</th>
                <th>{t('signals.price.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[150px] truncate text-sm">{test.product_title || `#${test.product_id}`}</td>
                  <td className="text-right tabular-nums text-sm">{Number(test.original_price).toLocaleString()}</td>
                  <td className="text-right tabular-nums text-sm">{Number(test.test_price).toLocaleString()}</td>
                  <td className="text-center"><span className={`badge ${statusColor(test.status)} badge-sm`}>{test.status}</span></td>
                  <td className="text-right tabular-nums text-sm">{test.original_sales ?? '\u2014'}</td>
                  <td className="text-right tabular-nums text-sm">{test.test_sales ?? '\u2014'}</td>
                  <td>
                    <div className="flex gap-1">
                      {test.status === 'PLANNED' && (
                        <button className="btn btn-xs btn-success" onClick={() => updateStatus(test.id, 'RUNNING')}>
                          {t('signals.price.startBtn')}
                        </button>
                      )}
                      {test.status === 'RUNNING' && (
                        <button className="btn btn-xs btn-info" onClick={() => updateStatus(test.id, 'COMPLETED')}>
                          {t('signals.price.endBtn')}
                        </button>
                      )}
                      {(test.status === 'PLANNED' || test.status === 'RUNNING') && (
                        <button className="btn btn-xs btn-ghost text-error" onClick={() => updateStatus(test.id, 'CANCELLED')}>
                          {t('signals.price.cancelBtn')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
