import { useState, useEffect, useCallback } from 'react';
import { productsApi } from '../api/client';
import type { TrackedProduct } from '../api/types';

interface UseTrackedProductsResult {
  trackedIds: Set<number>;
  isTracked: (id: number) => boolean;
  trackProduct: (id: number) => Promise<void>;
  loading: boolean;
}

export function useTrackedProducts(): UseTrackedProductsResult {
  const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    productsApi.getTracked()
      .then((res: { data: TrackedProduct[] }) => {
        if (!cancelled) {
          const ids = new Set(
            res.data.map((p) => Number(p.product_id)),
          );
          setTrackedIds(ids);
        }
      })
      .catch(() => {
        // Silent fail — dedup just won't work on error
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const isTracked = useCallback(
    (id: number): boolean => trackedIds.has(id),
    [trackedIds],
  );

  const trackProduct = useCallback(
    async (id: number): Promise<void> => {
      // Optimistic update
      setTrackedIds((prev) => new Set(prev).add(id));
      try {
        await productsApi.trackFromSearch(id);
      } catch {
        // Rollback on error
        setTrackedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        throw new Error('Track failed');
      }
    },
    [],
  );

  return { trackedIds, isTracked, trackProduct, loading };
}
