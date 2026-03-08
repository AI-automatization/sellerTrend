import { api } from './base';

export interface MeResponse {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  account: {
    id: string;
    name: string;
    status: string;
    balance: string;
    daily_fee: string | null;
    plan: string;
    plan_expires_at: string | null;
    analyses_used: number;
    onboarding_completed: boolean;
    onboarding_step: number;
    selected_marketplaces: string[];
    created_at: string;
  };
}

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
  getMe: () =>
    api.get<MeResponse>('/auth/me'),
  updateOnboarding: (data: { step?: number; completed?: boolean; marketplaces?: string[] }) =>
    api.patch('/auth/onboarding', data),
};
