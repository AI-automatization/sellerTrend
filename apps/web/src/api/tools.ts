import { api } from './base';

export const toolsApi = {
  calculateProfit: (data: {
    sell_price_uzs: number;
    unit_cost_usd: number;
    usd_to_uzs: number;
    uzum_commission_pct: number;
    fbo_cost_uzs?: number;
    ads_spend_uzs?: number;
    quantity: number;
  }) => api.post('/tools/profit-calculator', data),
  calculateElasticity: (data: {
    price_old: number;
    price_new: number;
    qty_old: number;
    qty_new: number;
  }) => api.post('/tools/price-elasticity', data),
  generateDescription: (data: {
    title: string;
    attributes?: Record<string, string | null>;
    category?: string;
    keywords?: string[];
  }) => api.post('/tools/generate-description', data),
  analyzeSentiment: (data: {
    productTitle: string;
    reviews: string[];
  }) => api.post('/tools/analyze-sentiment', data),
};

export const leaderboardApi = {
  getPublic: () => api.get('/leaderboard/public'),
  getByCategories: () => api.get('/leaderboard/public/categories'),
};

export const shopsApi = {
  getShop: (shopId: string) => api.get(`/shops/${shopId}`),
  getShopProducts: (shopId: string) => api.get(`/shops/${shopId}/products`),
};

export const referralApi = {
  generateCode: () => api.post('/referrals/generate-code'),
  getStats: () => api.get('/referrals/stats'),
};

export const apiKeysApi = {
  create: (name: string) => api.post('/api-keys', { name }),
  list: () => api.get('/api-keys'),
  remove: (id: string) => api.delete(`/api-keys/${id}`),
};

export const exportApi = {
  exportProductsCsv: () => api.get('/products/export/csv', { responseType: 'blob' }),
  exportDiscoveryExcel: (runId: string) =>
    api.get(`/discovery/export/excel?run_id=${runId}`, { responseType: 'blob' }),
  importCsv: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/products/import/csv', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
