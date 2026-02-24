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
  getMlForecast: (productId: string) =>
    api.get(`/products/${productId}/ml-forecast`),
  getTrendAnalysis: (productId: string) =>
    api.get(`/products/${productId}/trend-analysis`),
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
  createJob: (data: { product_id: number; product_title: string; platforms?: string[] }) =>
    api.post('/sourcing/jobs', data),
  getJob: (id: string) => api.get(`/sourcing/jobs/${id}`),
  listJobs: () => api.get('/sourcing/jobs'),
  getPlatforms: () => api.get('/sourcing/platforms'),
  getHistory: () => api.get('/sourcing/history'),
};

// Competitor types
export interface CompetitorDiscoverItem {
  product_id: string;
  title: string;
  sell_price: string | null;
  rating: number;
  orders_quantity: string;
  is_cheaper: boolean;
  price_diff_pct: number;
}

export interface TrackedCompetitor {
  tracking_id: string;
  competitor_product_id: string;
  competitor_title: string;
  is_active: boolean;
  latest_price: string | null;
  latest_full_price: string | null;
  latest_discount_pct: number;
  prev_price: string | null;
  trend: 'up' | 'down' | 'stable';
  last_snapshot_at: string | null;
}

// Competitor endpoints
export const competitorApi = {
  getPrices: (productId: string) =>
    api.get<{
      our_product: { product_id: string; title: string; sell_price: string | null; category_id: string };
      competitors: CompetitorDiscoverItem[];
    }>(`/competitor/products/${productId}/prices`),

  trackCompetitors: (productId: string, competitorProductIds: string[]) =>
    api.post<{ tracked_count: number; trackings: Array<{ id: string; competitor_product_id: string }> }>(
      '/competitor/track',
      { product_id: productId, competitor_product_ids: competitorProductIds },
    ),

  getTracked: (productId: string) =>
    api.get<{ competitors: TrackedCompetitor[] }>(`/competitor/products/${productId}/tracked`),

  getPriceHistory: (productId: string, competitorId: string) =>
    api.get<{
      tracking_id: string;
      snapshots: Array<{ id: string; sell_price: string | null; discount_pct: number; snapshot_at: string }>;
    }>(`/competitor/products/${productId}/competitors/${competitorId}/history`),

  untrack: (productId: string, competitorId: string) =>
    api.delete(`/competitor/products/${productId}/competitors/${competitorId}`),
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

// Consultation endpoints (Feature 15)
export const consultationApi = {
  list: (category?: string) =>
    api.get('/consultations', { params: category ? { category } : {} }),
  getCategories: () => api.get('/consultations/categories'),
  getMyListings: () => api.get('/consultations/my-listings'),
  getMyBookings: () => api.get('/consultations/my-bookings'),
  create: (data: {
    title: string;
    description?: string;
    category: string;
    price_uzs: number;
    duration_min?: number;
  }) => api.post('/consultations', data),
  book: (id: string, scheduled_at: string) =>
    api.post(`/consultations/${id}/book`, { scheduled_at }),
  complete: (id: string) => api.post(`/consultations/${id}/complete`),
  rate: (id: string, rating: number, review?: string) =>
    api.post(`/consultations/${id}/rate`, { rating, review }),
};

// Signals endpoints (v3.0)
export const signalsApi = {
  getCannibalization: () => api.get('/signals/cannibalization'),
  getDeadStock: () => api.get('/signals/dead-stock'),
  getSaturation: (categoryId: number) =>
    api.get('/signals/saturation', { params: { category_id: categoryId } }),
  getFlashSales: () => api.get('/signals/flash-sales'),
  getEarlySignals: () => api.get('/signals/early-signals'),
  getStockCliffs: () => api.get('/signals/stock-cliffs'),
  getRanking: (productId: string) => api.get(`/signals/ranking/${productId}`),
  getChecklist: (productId?: string) =>
    api.get('/signals/checklist', { params: productId ? { product_id: productId } : {} }),
  saveChecklist: (data: { product_id?: string; title: string; items: any[] }) =>
    api.post('/signals/checklist', data),
  createPriceTest: (data: { product_id: string; original_price: number; test_price: number }) =>
    api.post('/signals/price-tests', data),
  listPriceTests: () => api.get('/signals/price-tests'),
  updatePriceTest: (id: string, data: {
    status?: string; original_sales?: number; test_sales?: number; conclusion?: string;
  }) => api.patch(`/signals/price-tests/${id}`, data),
  getReplenishment: (leadTimeDays?: number) =>
    api.get('/signals/replenishment', { params: leadTimeDays ? { lead_time_days: leadTimeDays } : {} }),
};

// Ads ROI endpoints (v4.0 — Feature 31)
export const adsApi = {
  createCampaign: (data: { name: string; product_id?: number; platform?: string; budget_uzs?: number }) =>
    api.post('/ads/campaigns', data),
  listCampaigns: () => api.get('/ads/campaigns'),
  updateCampaign: (id: string, data: any) => api.patch(`/ads/campaigns/${id}`, data),
  getCampaignROI: (id: string) => api.get(`/ads/campaigns/${id}/roi`),
  deleteCampaign: (id: string) => api.delete(`/ads/campaigns/${id}`),
};

// Team endpoints (v4.0 — Feature 33)
export const teamApi = {
  invite: (data: { email: string; role?: string }) => api.post('/team/invite', data),
  listInvites: () => api.get('/team/invites'),
  listMembers: () => api.get('/team/members'),
  cancelInvite: (id: string) => api.delete(`/team/invites/${id}`),
};

// Reports endpoints (v4.0 — Features 34-35)
export const reportsApi = {
  create: (data: { title: string; description?: string; report_type: string; filters?: any; columns?: any; schedule?: string }) =>
    api.post('/reports', data),
  list: () => api.get('/reports'),
  remove: (id: string) => api.delete(`/reports/${id}`),
  generate: (id: string) => api.get(`/reports/${id}/generate`),
  marketShare: (categoryId: number) => api.get('/reports/market-share', { params: { category_id: categoryId } }),
};

// Watchlist endpoints (v4.0 — Feature 36)
export const watchlistApi = {
  create: (data: { name: string; description?: string; product_ids: string[] }) =>
    api.post('/watchlists', data),
  list: () => api.get('/watchlists'),
  share: (id: string) => api.post(`/watchlists/${id}/share`),
  getShared: (token: string) => api.get(`/watchlists/shared/${token}`),
  remove: (id: string) => api.delete(`/watchlists/${id}`),
};

// Community endpoints (v4.0 — Feature 38)
export const communityApi = {
  createInsight: (data: { title: string; content: string; category: string }) =>
    api.post('/community/insights', data),
  listInsights: (category?: string) =>
    api.get('/community/insights', { params: category ? { category } : {} }),
  vote: (insightId: string, vote: number) =>
    api.post(`/community/insights/${insightId}/vote`, { vote }),
  getCategories: () => api.get('/community/categories'),
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
