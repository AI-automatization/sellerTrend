import { api } from './base';
import type { SearchProduct, InstallmentSkuData, DailySalesPoint, PredictionResult, RiskResult } from './types';

export const productsApi = {
  getTracked: () => api.get('/products/tracked'),
  getProduct: (productId: string) => api.get(`/products/${productId}`),
  track: (productId: string) => api.post(`/products/${productId}/track`),
  untrack: (productId: string) => api.delete(`/products/${productId}/track`),
  setMine: (productId: string, isMine: boolean) => api.patch(`/products/${productId}/mine`, { is_mine: isMine }),
  getSnapshots: (productId: string) => api.get(`/products/${productId}/snapshots`),
  getForecast: (productId: string) => api.get(`/products/${productId}/forecast`),
  getMlForecast: (productId: string) => api.get(`/products/${productId}/ml-forecast`),
  getTrendAnalysis: (productId: string) => api.get(`/products/${productId}/trend-analysis`),
  getWeeklyTrend: (productId: string) => api.get(`/products/${productId}/weekly-trend`),
  searchProducts: (query: string, limit = 24, offset = 0) =>
    api.get<SearchProduct[]>('/products/search', { params: { q: query, limit, offset } }),
  trackFromSearch: (uzumProductId: number) =>
    api.post<{ tracked: boolean }>(`/products/search/${uzumProductId}/track`),
  getInstallments: (productId: string) =>
    api.get<InstallmentSkuData[]>(`/products/${productId}/installments`),
  getDailySales: (productId: string) =>
    api.get<DailySalesPoint[]>(`/products/${productId}/daily-sales`),
};

export const uzumApi = {
  analyzeUrl: (url: string) => api.post('/uzum/analyze', { url }, { timeout: 60_000 }),
  analyzeById: (id: string) => api.get(`/uzum/product/${id}`, { timeout: 60_000 }),
};

export const predictionsApi = {
  getPrediction: (productId: string, horizon = 7) =>
    api.get<PredictionResult>(`/predictions/${productId}`, { params: { horizon } }),
  getRisk: (productId: string) =>
    api.get<RiskResult>(`/predictions/${productId}/risk`),
};

