import { api } from './base';

export const sourcingApi = {
  getCurrencyRates: () => api.get('/sourcing/currency-rates'),
  refreshRates: () => api.post('/sourcing/currency-rates/refresh'),
  getCargoProviders: (origin?: string) =>
    api.get('/sourcing/cargo/providers', { params: origin ? { origin } : {} }),
  calculateCargo: (data: {
    item_name?: string;
    item_cost_usd: number;
    weight_kg: number;
    quantity: number;
    provider_id: string;
    customs_rate?: number;
    sell_price_uzs?: number;
  }) => api.post('/sourcing/cargo/calculate', data),
  searchPrices: (query: string, source: string) =>
    api.post('/sourcing/search', { query, source }),
  createJob: (data: { product_id: number; product_title: string; platforms?: string[] }) =>
    api.post('/sourcing/jobs', data),
  getJob: (id: string) => api.get(`/sourcing/jobs/${id}`),
  listJobs: () => api.get('/sourcing/jobs'),
  getPlatforms: () => api.get('/sourcing/platforms'),
  getHistory: () => api.get('/sourcing/history'),
};
