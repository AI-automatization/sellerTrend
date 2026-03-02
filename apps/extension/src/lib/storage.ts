import { Storage } from "@plasmohq/storage";

const storage = new Storage({ area: "local" });

const KEYS = {
  ACCESS_TOKEN: "ventra_access_token",
  REFRESH_TOKEN: "ventra_refresh_token",
} as const;

export async function getAccessToken(): Promise<string | null> {
  return (await storage.get(KEYS.ACCESS_TOKEN)) ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await storage.get(KEYS.REFRESH_TOKEN)) ?? null;
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await storage.set(KEYS.ACCESS_TOKEN, accessToken);
  await storage.set(KEYS.REFRESH_TOKEN, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await storage.remove(KEYS.ACCESS_TOKEN);
  await storage.remove(KEYS.REFRESH_TOKEN);
}

// ── JWT helpers ──────────────────────────────────────────────

export interface JwtTokenPayload {
  sub: string;
  email: string;
  role: string;
  account_id: string;
  exp: number;
  iat?: number;
}

export function decodeToken(token: string): JwtTokenPayload | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as JwtTokenPayload;
    return payload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp < nowSec;
}

export { KEYS, storage };
