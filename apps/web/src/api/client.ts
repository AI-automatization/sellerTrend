import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// Helper: decode JWT payload without verification
export function getTokenPayload(): { role?: string; account_id?: string } | null {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, company_name: string, referral_code?: string) =>
    api.post('/auth/register', { email, password, company_name, ...(referral_code ? { referral_code } : {}) }),
};

// Products endpoints
export const productsApi = {
  getTracked: () => api.get('/products/tracked'),
  getProduct: (productId: string) => api.get(`/products/${productId}`),
  track: (productId: string) => api.post(`/products/${productId}/track`),
  getSnapshots: (productId: string) =>
    api.get(`/products/${productId}/snapshots`),
  getForecast: (productId: string) =>
    api.get(`/products/${productId}/forecast`),
};

// Uzum endpoints
export const uzumApi = {
  analyzeUrl: (url: string) => api.post('/uzum/analyze', { url }),
  analyzeById: (id: string) => api.get(`/uzum/product/${id}`),
};

// Billing endpoints
export const billingApi = {
  getBalance: () => api.get('/billing/balance'),
};

// Discovery endpoints
export const discoveryApi = {
  startRun: (input: string | number) =>
    api.post('/discovery/run', { input: String(input) }),
  listRuns: () => api.get('/discovery/runs'),
  getRun: (id: string) => api.get(`/discovery/runs/${id}`),
  getLeaderboard: (categoryId?: number) =>
    api.get('/discovery/leaderboard', { params: categoryId ? { category_id: categoryId } : {} }),
};

// Sourcing endpoints
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
  // Full sourcing job API
  createJob: (data: { product_id: number; product_title: string; platforms?: string[] }) =>
    api.post('/sourcing/jobs', data),
  getJob: (id: string) => api.get(`/sourcing/jobs/${id}`),
  listJobs: () => api.get('/sourcing/jobs'),
  getPlatforms: () => api.get('/sourcing/platforms'),
  getHistory: () => api.get('/sourcing/history'),
};

// Leaderboard endpoints (public)
export const leaderboardApi = {
  getPublic: () => api.get('/leaderboard/public'),
  getByCategories: () => api.get('/leaderboard/public/categories'),
};

// Shops endpoints
export const shopsApi = {
  getShop: (shopId: string) => api.get(`/shops/${shopId}`),
  getShopProducts: (shopId: string) => api.get(`/shops/${shopId}/products`),
};

// Tools endpoints
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
};

// Referral endpoints
export const referralApi = {
  generateCode: () => api.post('/referrals/generate-code'),
  getStats: () => api.get('/referrals/stats'),
};

// API Keys endpoints
export const apiKeysApi = {
  create: (name: string) => api.post('/api-keys', { name }),
  list: () => api.get('/api-keys'),
  remove: (id: string) => api.delete(`/api-keys/${id}`),
};

// Export endpoints
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

// Seasonal + Niche endpoints (under discovery)
export const seasonalApi = {
  getCalendar: () => api.get('/discovery/seasonal-calendar'),
  getUpcoming: () => api.get('/discovery/seasonal-calendar/upcoming'),
};

export const nicheApi = {
  findNiches: (categoryId?: number) =>
    api.get('/discovery/niches', { params: categoryId ? { category_id: categoryId } : {} }),
  findGaps: (categoryId?: number) =>
    api.get('/discovery/niches/gaps', { params: categoryId ? { category_id: categoryId } : {} }),
};

// Admin endpoints (SUPER_ADMIN only)
export const adminApi = {
  listAccounts: () => api.get('/admin/accounts'),
  getAccount: (id: string) => api.get(`/admin/accounts/${id}`),
  createAccount: (data: { company_name: string; email: string; password: string; role: string }) =>
    api.post('/admin/accounts', data),
  setFee: (id: string, fee: number | null) =>
    api.patch(`/admin/accounts/${id}/fee`, { fee }),
  deposit: (id: string, amount: number, description?: string) =>
    api.post(`/admin/accounts/${id}/deposit`, { amount, description }),
  getGlobalFee: () => api.get('/admin/global-fee'),
  setGlobalFee: (fee: number) => api.put('/admin/global-fee', { fee }),
  getAuditLog: (limit?: number) =>
    api.get('/admin/audit-log', { params: { limit } }),
  listUsers: () => api.get('/admin/users'),
  createUser: (accountId: string, data: { email: string; password: string; role: string }) =>
    api.post(`/admin/accounts/${accountId}/users`, data),
  updateRole: (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}/role`, { role }),
  toggleActive: (userId: string) =>
    api.patch(`/admin/users/${userId}/toggle-active`),
};
