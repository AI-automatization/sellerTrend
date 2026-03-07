import { api } from './base';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, company_name: string, referral_code?: string) =>
    api.post('/auth/register', { email, password, company_name, ...(referral_code ? { referral_code } : {}) }),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  updateOnboarding: (data: { step?: number; completed?: boolean; marketplaces?: string[] }) =>
    api.patch('/auth/onboarding', data),
};
