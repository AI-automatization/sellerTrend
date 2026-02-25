import { create } from 'zustand';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  account_id: string;
  exp: number;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  payload: TokenPayload | null;
  setTokens: (access: string, refresh: string) => void;
  clearTokens: () => void;
}

function decodePayload(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64)) as TokenPayload;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const stored = localStorage.getItem('access_token');
  return {
    accessToken: stored,
    refreshToken: localStorage.getItem('refresh_token'),
    payload: stored ? decodePayload(stored) : null,

    setTokens: (access, refresh) => {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      set({
        accessToken: access,
        refreshToken: refresh,
        payload: decodePayload(access),
      });
    },

    clearTokens: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ accessToken: null, refreshToken: null, payload: null });
    },
  };
});
