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

// Handle 401 / 402
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
};

// Uzum endpoints
export const uzumApi = {
  analyzeUrl: (url: string) => api.post('/uzum/analyze', { url }),
};

// Billing endpoints
export const billingApi = {
  getBalance: () => api.get('/billing/balance'),
};
