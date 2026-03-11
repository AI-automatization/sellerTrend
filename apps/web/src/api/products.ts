import { api } from './base';
import type { SearchProduct, SourcingComparison } from './types';

export const productsApi = {
  getTracked: () => api.get('/products/tracked'),
  getProduct: (productId: string) => api.get(`/products/${productId}`),
  track: (productId: string) => api.post(`/products/${productId}/track`),
  getSnapshots: (productId: string) => api.get(`/products/${productId}/snapshots`),
  getForecast: (productId: string) => api.get(`/products/${productId}/forecast`),
  getMlForecast: (productId: string) => api.get(`/products/${productId}/ml-forecast`),
  getTrendAnalysis: (productId: string) => api.get(`/products/${productId}/trend-analysis`),
  getWeeklyTrend: (productId: string) => api.get(`/products/${productId}/weekly-trend`),
  searchProducts: (query: string, limit = 24) =>
    api.get<SearchProduct[]>('/products/search', { params: { q: query, limit } }),
  trackFromSearch: (uzumProductId: number) =>
    api.post<{ tracked: boolean }>(`/products/search/${uzumProductId}/track`),
  getSourcingComparison: (productId: string) =>
    api.get<SourcingComparison>(`/products/${productId}/sourcing-comparison`),
};

export const uzumApi = {
  analyzeUrl: (url: string) => api.post('/uzum/analyze', { url }, { timeout: 60_000 }),
  analyzeById: (id: string) => api.get(`/uzum/product/${id}`, { timeout: 60_000 }),
};

export const revenueApi = {
  getEstimate: (productId: string) => api.get(`/products/${productId}/revenue-estimate`),
};

export const achievementsApi = {
  getAll: () => api.get('/achievements'),
};

export const billingApi = {
  getBalance: () => api.get('/billing/balance'),
};
