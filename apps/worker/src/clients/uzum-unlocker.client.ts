/**
 * UzumUnlockerClient — Bright Data Web Unlocker proxy orqali
 * uzum.uz REST API dan mahsulot ma'lumotlarini oladi.
 *
 * Nima uchun Playwright emas:
 *   Playwright (Chromium) = 300-600MB RAM, sahifa render uchun 3-10 soniya.
 *   Web Unlocker = HTTP proxy, 100-500ms, browser yuklamasiz.
 *
 * Bright Data Web Unlocker endpoint:
 *   http://{BRIGHT_DATA_USERNAME}:{BRIGHT_DATA_PASSWORD}@brd.superproxy.io:22225
 *
 * Fallback:
 *   BRIGHT_DATA_USERNAME/PASSWORD yo'q bo'lsa → to'g'ridan Uzum REST API.
 */

import { ProxyAgent, fetch as undiciFetch } from 'undici';

const UZUM_REST_BASE = 'https://api.uzum.uz/api/v2';
const REQUEST_TIMEOUT_MS = 20_000;

const UZUM_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  Accept: 'application/json',
};

export interface UzumOrdersData {
  readonly ordersAmount: number;
  readonly totalAvailableAmount: number;
  readonly sellPrice: number | null;
  readonly rating: number;
  readonly reviewsAmount: number;
}

class UzumUnlockerClient {
  private readonly proxyUri: string | null;
  private readonly proxy: ProxyAgent | null;

  constructor() {
    const user = process.env.BRIGHT_DATA_USERNAME;
    const pass = process.env.BRIGHT_DATA_PASSWORD;

    if (user && pass) {
      this.proxyUri = `http://${user}:${pass}@brd.superproxy.io:22225`;
      this.proxy = new ProxyAgent(this.proxyUri);
    } else {
      this.proxyUri = null;
      this.proxy = null;
    }
  }

  /** Bright Data Web Unlocker konfiguratsiyalangan bo'lsa true */
  get isAvailable(): boolean {
    return this.proxy !== null;
  }

  /**
   * Uzum REST API orqali mahsulot buyurtma ma'lumotlarini oladi.
   * Bright Data proxy mavjud bo'lsa — unlocker orqali; aks holda to'g'ridan.
   *
   * @returns UzumOrdersData | null (xato yoki mahsulot topilmasa)
   */
  async fetchProductOrders(productId: number): Promise<UzumOrdersData | null> {
    const url = `${UZUM_REST_BASE}/product/${productId}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const fetchOptions: Parameters<typeof undiciFetch>[1] = {
        headers: UZUM_HEADERS,
        signal: controller.signal,
        ...(this.proxy ? { dispatcher: this.proxy } : {}),
      };

      const res = await undiciFetch(url, fetchOptions);

      if (res.status === 404) return null;
      if (!res.ok) return null;

      const body = (await res.json()) as {
        payload?: {
          data?: {
            ordersAmount?: number;
            totalAvailableAmount?: number;
            rating?: number;
            reviewsAmount?: number;
            skuList?: Array<{ purchasePrice?: number }>;
          };
        };
      };

      const data = body?.payload?.data;
      if (!data) return null;

      const sellPrice = data.skuList?.[0]?.purchasePrice ?? null;

      return {
        ordersAmount: data.ordersAmount ?? 0,
        totalAvailableAmount: data.totalAvailableAmount ?? 0,
        sellPrice: typeof sellPrice === 'number' ? sellPrice : null,
        rating: data.rating ?? 0,
        reviewsAmount: data.reviewsAmount ?? 0,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return null;
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const uzumUnlockerClient = new UzumUnlockerClient();
