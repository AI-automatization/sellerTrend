import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { queryClient } from '../stores/queryClient';
import { useAuthStore, type TokenPayload } from '../stores/authStore';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
  timeout: 30_000,
});

// Attach JWT token + cache-busting to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Prevent browser HTTP cache from serving stale API responses
  if (config.method === 'get') {
    config.params = { ...config.params, _t: Date.now() };
  }
  return config;
});

// ── Refresh token retry logic ──────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processPendingQueue(token: string | null, error: unknown) {
  for (const p of pendingQueue) {
    if (token) p.resolve(token);
    else p.reject(error);
  }
  pendingQueue = [];
}

// Handle 401 → try refresh → retry, 402 → payment due event
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401: attempt token refresh (skip if this IS the refresh/login request)
    if (
      err.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        queryClient.clear();
        useAuthStore.getState().clearTokens();
        window.location.href = '/login';
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await api.post('/auth/refresh', { refresh_token: refreshToken });
        const { access_token, refresh_token: newRefresh } = res.data;

        // Zustand store + localStorage birga yangilanadi
        useAuthStore.getState().setTokens(access_token, newRefresh);

        processPendingQueue(access_token, null);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processPendingQueue(null, refreshErr);
        queryClient.clear();
        useAuthStore.getState().clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // 401 on non-auth endpoints without refresh token — redirect to login
    if (
      err.response?.status === 401 &&
      !originalRequest?.url?.includes('/auth/')
    ) {
      queryClient.clear();
      useAuthStore.getState().clearTokens();
      window.location.href = '/login';
    }

    if (err.response?.status === 402) {
      const responseData = err.response?.data as Record<string, unknown> | undefined;
      window.dispatchEvent(new CustomEvent('payment-due', {
        detail: {
          message: (responseData?.message as string) ?? "To'lov muddati o'tgan",
          balance: responseData?.balance,
        },
      }));
    }
    return Promise.reject(err);
  },
);

// ── JWT helpers (store-based, no duplicate decode) ────────

// Read payload from Zustand store (already decoded on setTokens)
export function getTokenPayload(): TokenPayload | null {
  return useAuthStore.getState().payload;
}

// Check if user is authenticated with a non-expired JWT
export function isTokenValid(): boolean {
  const payload = useAuthStore.getState().payload;
  if (!payload) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    useAuthStore.getState().clearTokens();
    return false;
  }
  return true;
}
