import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { productsApi, exportApi, getTokenPayload } from '../api/client';
import { logError, toastError } from '../utils/handleError';
import { formatISODate } from '../utils/formatDate';
import type { TrackedProduct } from '../api/types';

export function useDashboardData() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const isSuperAdmin = getTokenPayload()?.role === 'SUPER_ADMIN';
  const location = useLocation();

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    productsApi.getTracked().then((r) => setProducts(r.data)).catch((err) => {
      logError(err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [location.key, fetchData]);

  useEffect(() => {
    window.addEventListener('product-tracked', fetchData);
    return () => window.removeEventListener('product-tracked', fetchData);
  }, [fetchData]);

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

  return { products, setProducts, loading, error, isSuperAdmin, exporting, handleExportCsv };
}
