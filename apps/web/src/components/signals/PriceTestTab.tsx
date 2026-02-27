import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError, toastError } from '../../utils/handleError';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { PriceTestItem } from './types';

export function PriceTestTab() {
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
        title="A/B Narx Testlash"
        desc="Turli narxlarni sinab, eng yaxshisini toping"
      />

      {/* Create form */}
      <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-6">
        <p className="text-xs text-base-content/50 mb-3">Yangi test yaratish</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            className="input input-bordered input-sm w-36"
            placeholder="Product ID"
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
          />
          <input
            type="number"
            className="input input-bordered input-sm w-36"
            placeholder="Asl narx"
            value={form.original_price}
            onChange={(e) => setForm({ ...form, original_price: e.target.value })}
          />
          <input
            type="number"
            className="input input-bordered input-sm w-36"
            placeholder="Test narx"
            value={form.test_price}
            onChange={(e) => setForm({ ...form, test_price: e.target.value })}
          />
          <button className="btn btn-primary btn-sm" onClick={createTest} disabled={creating}>
            {creating ? <span className="loading loading-spinner loading-xs" /> : 'Yaratish'}
          </button>
        </div>
      </div>

      {tests.length === 0 ? (
        <EmptyState text="Hali test yo'q — yuqorida yangi test yarating" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>Mahsulot</th>
                <th className="text-right">Asl narx</th>
                <th className="text-right">Test narx</th>
                <th className="text-center">Status</th>
                <th className="text-right">Asl sotuv</th>
                <th className="text-right">Test sotuv</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[150px] truncate text-sm">{t.product_title || `#${t.product_id}`}</td>
                  <td className="text-right tabular-nums text-sm">{Number(t.original_price).toLocaleString()}</td>
                  <td className="text-right tabular-nums text-sm">{Number(t.test_price).toLocaleString()}</td>
                  <td className="text-center"><span className={`badge ${statusColor(t.status)} badge-sm`}>{t.status}</span></td>
                  <td className="text-right tabular-nums text-sm">{t.original_sales ?? '\u2014'}</td>
                  <td className="text-right tabular-nums text-sm">{t.test_sales ?? '\u2014'}</td>
                  <td>
                    <div className="flex gap-1">
                      {t.status === 'PLANNED' && (
                        <button className="btn btn-xs btn-success" onClick={() => updateStatus(t.id, 'RUNNING')}>
                          Boshlash
                        </button>
                      )}
                      {t.status === 'RUNNING' && (
                        <button className="btn btn-xs btn-info" onClick={() => updateStatus(t.id, 'COMPLETED')}>
                          Tugatish
                        </button>
                      )}
                      {(t.status === 'PLANNED' || t.status === 'RUNNING') && (
                        <button className="btn btn-xs btn-ghost text-error" onClick={() => updateStatus(t.id, 'CANCELLED')}>
                          Bekor
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
