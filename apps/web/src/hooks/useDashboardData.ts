import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { productsApi, billingApi, exportApi, getTokenPayload } from '../api/client';
import { logError, toastError } from '../utils/handleError';
import { formatISODate } from '../utils/formatDate';
import type { TrackedProduct, Balance } from '../api/types';

export function useDashboardData() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const isSuperAdmin = getTokenPayload()?.role === 'SUPER_ADMIN';
  const location = useLocation();

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    const promises: Promise<unknown>[] = [
      productsApi.getTracked().then((r) => setProducts(r.data)).catch((err) => {
        logError(err);
        setError(err instanceof Error ? err.message : 'Failed to load products');
      }),
    ];
    if (!isSuperAdmin) {
      promises.push(billingApi.getBalance().then((r) => setBalance(r.data)).catch(logError));
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchData();
  }, [location.key, fetchData]);

  async function handleExportCsv() {
    setExporting(true);
    try {
      const res = await exportApi.exportProductsCsv();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventra-products-${formatISODate()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) { toastError(err, 'CSV eksport xatosi'); } finally {
      setExporting(false);
    }
  }

  return { products, balance, loading, error, isSuperAdmin, exporting, handleExportCsv };
}
