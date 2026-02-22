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
  register: (email: string, password: string, company_name: string) =>
    api.post('/auth/register', { email, password, company_name }),
};

// Products endpoints
export const productsApi = {
  getTracked: () => api.get('/products/tracked'),
  track: (productId: string) => api.post(`/products/${productId}/track`),
  getSnapshots: (productId: string) =>
    api.get(`/products/${productId}/snapshots`),
  getForecast: (productId: string) =>
    api.get(`/products/${productId}/forecast`),
};

// Uzum endpoints
export const uzumApi = {
  analyzeUrl: (url: string) => api.post('/uzum/analyze', { url }),
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

// Admin endpoints (SUPER_ADMIN only)
export const adminApi = {
  listAccounts: () => api.get('/admin/accounts'),
  getAccount: (id: string) => api.get(`/admin/accounts/${id}`),
  setFee: (id: string, fee: number | null) =>
    api.patch(`/admin/accounts/${id}/fee`, { fee }),
  deposit: (id: string, amount: number, description?: string) =>
    api.post(`/admin/accounts/${id}/deposit`, { amount, description }),
  getGlobalFee: () => api.get('/admin/global-fee'),
  setGlobalFee: (fee: number) => api.put('/admin/global-fee', { fee }),
  getAuditLog: (limit?: number) =>
    api.get('/admin/audit-log', { params: { limit } }),
};
