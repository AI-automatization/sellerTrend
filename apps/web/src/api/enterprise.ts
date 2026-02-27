import { api } from './base';

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
  saveChecklist: (data: { product_id?: string; title: string; items: { key: string; label: string; done: boolean }[] }) =>
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

export const adsApi = {
  createCampaign: (data: { name: string; product_id?: number; platform?: string; budget_uzs?: number }) =>
    api.post('/ads/campaigns', data),
  listCampaigns: () => api.get('/ads/campaigns'),
  updateCampaign: (id: string, data: Record<string, unknown>) => api.patch(`/ads/campaigns/${id}`, data),
  getCampaignROI: (id: string) => api.get(`/ads/campaigns/${id}/roi`),
  deleteCampaign: (id: string) => api.delete(`/ads/campaigns/${id}`),
};

export const teamApi = {
  invite: (data: { email: string; role?: string }) => api.post('/team/invite', data),
  listInvites: () => api.get('/team/invites'),
  listMembers: () => api.get('/team/members'),
  cancelInvite: (id: string) => api.delete(`/team/invites/${id}`),
};

export const reportsApi = {
  create: (data: { title: string; description?: string; report_type: string; filters?: Record<string, unknown>; columns?: string[]; schedule?: string }) =>
    api.post('/reports', data),
  list: () => api.get('/reports'),
  remove: (id: string) => api.delete(`/reports/${id}`),
  generate: (id: string) => api.get(`/reports/${id}/generate`),
  marketShare: (categoryId: number) => api.get('/reports/market-share', { params: { category_id: categoryId } }),
};

export const watchlistApi = {
  create: (data: { name: string; description?: string; product_ids: string[] }) =>
    api.post('/watchlists', data),
  list: () => api.get('/watchlists'),
  share: (id: string) => api.post(`/watchlists/${id}/share`),
  getShared: (token: string) => api.get(`/watchlists/shared/${token}`),
  remove: (id: string) => api.delete(`/watchlists/${id}`),
};

export const communityApi = {
  createInsight: (data: { title: string; content: string; category: string }) =>
    api.post('/community/insights', data),
  listInsights: (category?: string) =>
    api.get('/community/insights', { params: category ? { category } : {} }),
  vote: (insightId: string, vote: number) =>
    api.post(`/community/insights/${insightId}/vote`, { vote }),
  getCategories: () => api.get('/community/categories'),
};
