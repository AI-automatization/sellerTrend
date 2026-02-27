import { api } from './base';

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
  changeUserPassword: (userId: string, password: string) =>
    api.patch(`/admin/users/${userId}/password`, { password }),
  toggleActive: (userId: string) =>
    api.patch(`/admin/users/${userId}/toggle-active`),
  getStatsOverview: () => api.get('/admin/stats/overview'),
  getStatsRevenue: (period = 30) => api.get('/admin/stats/revenue', { params: { period } }),
  getStatsGrowth: (period = 30) => api.get('/admin/stats/growth', { params: { period } }),
  getPopularProducts: (limit = 20) => api.get('/admin/stats/popular-products', { params: { limit } }),
  getPopularCategories: (limit = 10) => api.get('/admin/stats/popular-categories', { params: { limit } }),
  getRealtimeStats: () => api.get('/admin/stats/realtime'),
  getProductHeatmap: (period = '30d') => api.get('/admin/stats/product-heatmap', { params: { period } }),
  getCategoryTrends: (weeks = 8) => api.get('/admin/stats/category-trends', { params: { weeks } }),
  getTopUsers: (limit = 20) => api.get('/admin/stats/top-users', { params: { limit } }),
  getSystemHealth: () => api.get('/admin/stats/health'),
  getUserActivity: (userId: string, page = 1, limit = 50) =>
    api.get(`/admin/users/${userId}/activity`, { params: { page, limit } }),
  getUserTrackedProducts: (userId: string) => api.get(`/admin/users/${userId}/tracked-products`),
  getUserSessions: (userId: string, limit = 20) =>
    api.get(`/admin/users/${userId}/sessions`, { params: { limit } }),
  getUserUsage: (userId: string) => api.get(`/admin/users/${userId}/usage`),
  getUserPortfolio: (userId: string) => api.get(`/admin/users/${userId}/portfolio-summary`),
  getUserDiscovery: (userId: string) => api.get(`/admin/users/${userId}/discovery-results`),
  getUserCampaigns: (userId: string) => api.get(`/admin/users/${userId}/campaigns`),
  getUserCompetitors: (userId: string) => api.get(`/admin/users/${userId}/competitor-stats`),
  getAccountTransactions: (accountId: string, page = 1, limit = 50) =>
    api.get(`/admin/accounts/${accountId}/transactions`, { params: { page, limit } }),
  impersonateUser: (userId: string) => api.post(`/admin/users/${userId}/impersonate`),
  bulkAction: (data: { account_ids: string[]; action: string; params?: Record<string, unknown> }) =>
    api.post('/admin/accounts/bulk', data),
  updateAccountStatus: (accountId: string, status: string) =>
    api.patch(`/admin/accounts/${accountId}/status`, { status }),
  getDepositLog: (page = 1, limit = 20) => api.get(`/admin/deposit-log?page=${page}&limit=${limit}`),
  deleteDeposit: (id: string) => api.delete(`/admin/deposit-log/${id}`),
  globalSearch: (q: string) => api.get('/admin/search', { params: { q } }),
  getAdminFeedback: (params?: { status?: string; type?: string; page?: number; limit?: number }) =>
    api.get('/feedback/admin/tickets', { params }),
  getFeedbackStats: () => api.get('/feedback/admin/stats'),
  getFeedbackDetail: (id: string) => api.get(`/feedback/${id}`),
  updateFeedbackStatus: (id: string, status: string) =>
    api.patch(`/feedback/admin/tickets/${id}/status`, { status }),
  sendFeedbackMessage: (id: string, content: string) =>
    api.post(`/feedback/admin/tickets/${id}/messages`, { content }),
  exportUsers: () => api.get('/admin/export/users', { responseType: 'blob' }),
  exportRevenue: (from?: string, to?: string) =>
    api.get('/admin/export/revenue', { params: { from, to }, responseType: 'blob' }),
  updateAccountPhone: (accountId: string, phone: string | null) =>
    api.patch(`/admin/accounts/${accountId}/phone`, { phone }),
  listNotificationTemplates: () => api.get('/admin/notification-templates'),
  createNotificationTemplate: (data: { name: string; message: string; type: string }) =>
    api.post('/admin/notification-templates', data),
  deleteNotificationTemplate: (id: string) => api.delete(`/admin/notification-templates/${id}`),
  sendNotificationAdvanced: (data: { message: string; type: string; target: 'all' | string[] }) =>
    api.post('/admin/notifications/send', data),
  getAiUsageStats: (period = 30) => api.get('/admin/stats/ai-usage', { params: { period } }),
  getSystemErrors: (params?: { page?: number; limit?: number; endpoint?: string; status_gte?: number; account_id?: string; period?: number }) =>
    api.get('/admin/system-errors', { params }),
};

export const feedbackApi = {
  create: (data: { subject: string; type: string; priority: string; content: string }) =>
    api.post('/feedback', data),
  getMyTickets: () => api.get('/feedback/my'),
  getTicket: (id: string) => api.get(`/feedback/${id}`),
  sendMessage: (id: string, content: string) =>
    api.post(`/feedback/${id}/messages`, { content }),
};

export const notificationApi = {
  getMy: () => api.get('/notifications/my'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
};
