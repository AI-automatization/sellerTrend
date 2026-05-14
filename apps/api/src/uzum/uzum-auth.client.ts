import { Injectable, Logger } from '@nestjs/common';
import { Impit } from 'impit';

interface UndiciRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  dispatcher?: unknown;
}

const AUTH_TOKEN_URL = 'https://id.uzum.uz/api/auth/token';
const SERVER_IID = process.env.UZUM_IID ?? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export const UZUM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  Accept: 'application/json',
  'x-iid': SERVER_IID,
};

export const UZUM_SERVER_IID = SERVER_IID;

export const uzumProxyDispatcher: unknown = process.env.PROXY_URL
  ? (() => { const { ProxyAgent } = require('undici'); return new ProxyAgent(process.env.PROXY_URL); })()
  : undefined;

let impitInstance: Impit | null = null;
export function getImpitInstance(): Impit {
  if (!impitInstance) {
    const opts: ConstructorParameters<typeof Impit>[0] = { browser: 'chrome' };
    if (process.env.PROXY_URL) opts.proxyUrl = process.env.PROXY_URL;
    impitInstance = new Impit(opts);
  }
  return impitInstance;
}

export async function fetchWithTimeout(
  url: string,
  opts: UndiciRequestInit = {},
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await (fetch as (url: string, init: UndiciRequestInit) => Promise<Response>)(
      url,
      { ...opts, signal: controller.signal },
    );
  } finally {
    clearTimeout(timer);
  }
}

let cachedAnonToken: string | null = null;
let cachedAnonCookies: string | null = null;
let cachedAnonTokenExpiry = 0;

@Injectable()
export class UzumAuthClient {
  private readonly logger = new Logger(UzumAuthClient.name);

  async getAnonymousToken(): Promise<string | null> {
    const now = Date.now();
    if (cachedAnonToken && cachedAnonTokenExpiry > now) return cachedAnonToken;

    const result = await this.acquireTokenViaImpit() ?? await this.acquireTokenViaFetch();

    if (result) {
      cachedAnonToken = result.token;
      cachedAnonCookies = result.cookies;
      cachedAnonTokenExpiry = now + 5 * 60 * 60 * 1000;
      this.logger.log('Anonymous Uzum token acquired');
    }

    return result?.token ?? null;
  }

  getCachedCookies(): string | null {
    return cachedAnonCookies;
  }

  invalidateToken(): void {
    cachedAnonToken = null;
    cachedAnonCookies = null;
    cachedAnonTokenExpiry = 0;
  }

  private async acquireTokenViaImpit(): Promise<{ token: string; cookies: string | null } | null> {
    try {
      const impit = getImpitInstance();
      const res = await impit.fetch(AUTH_TOKEN_URL, {
        method: 'POST',
        headers: { ...UZUM_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok && res.status !== 204) { this.logger.warn(`acquireTokenViaImpit HTTP ${res.status}`); return null; }
      return this.extractTokenAndCookies(res);
    } catch (err: unknown) {
      this.logger.warn(`acquireTokenViaImpit failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  private async acquireTokenViaFetch(): Promise<{ token: string; cookies: string | null } | null> {
    try {
      const res = await fetchWithTimeout(AUTH_TOKEN_URL, {
        method: 'POST',
        headers: { ...UZUM_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        dispatcher: uzumProxyDispatcher,
      });
      if (!res.ok && res.status !== 204) { this.logger.warn(`acquireTokenViaFetch HTTP ${res.status}`); return null; }
      return this.extractTokenAndCookies(res);
    } catch (err: unknown) {
      this.logger.error(`acquireTokenViaFetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  private async extractTokenAndCookies(res: {
    headers: { getSetCookie?: () => string[] };
    json: () => Promise<unknown>;
  }): Promise<{ token: string; cookies: string | null } | null> {
    const setCookies = res.headers.getSetCookie?.() ?? [];
    let token: string | null = null;
    const cookieParts: string[] = [];

    for (const cookie of setCookies) {
      const nameValue = cookie.split(';')[0].trim();
      if (nameValue) cookieParts.push(nameValue);
      const match = cookie.match(/access_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      try {
        const body = (await res.json()) as Record<string, unknown>;
        token = (body.access_token as string) ?? null;
      } catch { /* 204 responses */ }
    }

    if (!token) return null;
    return { token, cookies: cookieParts.length > 0 ? cookieParts.join('; ') : null };
  }
}
