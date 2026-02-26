import { api } from './base';

export interface CompetitorProduct {
  id: string;
  competitor_product_id: string;
  title: string;
  shop_name: string;
  latest_price: number | null;
  previous_price: number | null;
  price_trend: 'up' | 'down' | 'stable';
  discount_pct: number | null;
  created_at: string;
}

export interface CompetitorPricePoint {
  sell_price: number;
  full_price: number | null;
  discount_pct: number | null;
  snapshot_at: string;
}

export interface DiscoveredCompetitor {
  product_id: number;
  title: string;
  sell_price: number;
  shop_name: string;
  orders_amount: number;
}

export const competitorApi = {
  discover: (productId: string) =>
    api.get<DiscoveredCompetitor[]>(`/competitor/products/${productId}/prices`),
  track: (productId: string, competitorIds: number[]) =>
    api.post('/competitor/track', { product_id: Number(productId), competitor_product_ids: competitorIds }),
  getTracked: (productId: string) =>
    api.get<CompetitorProduct[]>(`/competitor/products/${productId}/tracked`),
  getHistory: (productId: string, competitorId: string) =>
    api.get<CompetitorPricePoint[]>(`/competitor/products/${productId}/competitors/${competitorId}/history`),
  untrack: (productId: string, competitorId: string) =>
    api.delete(`/competitor/products/${productId}/competitors/${competitorId}`),
};
