import { api } from './base';

export const productsApi = {
  getTracked: () => api.get('/products/tracked'),
  getProduct: (productId: string) => api.get(`/products/${productId}`),
  track: (productId: string) => api.post(`/products/${productId}/track`),
  getSnapshots: (productId: string) => api.get(`/products/${productId}/snapshots`),
  getForecast: (productId: string) => api.get(`/products/${productId}/forecast`),
  getMlForecast: (productId: string) => api.get(`/products/${productId}/ml-forecast`),
  getTrendAnalysis: (productId: string) => api.get(`/products/${productId}/trend-analysis`),
  getWeeklyTrend: (productId: string) => api.get(`/products/${productId}/weekly-trend`),
};

export const uzumApi = {
  analyzeUrl: (url: string) => api.post('/uzum/analyze', { url }),
  analyzeById: (id: string) => api.get(`/uzum/product/${id}`),
};

export const billingApi = {
  getBalance: () => api.get('/billing/balance'),
};
