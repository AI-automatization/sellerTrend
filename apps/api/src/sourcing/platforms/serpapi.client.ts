import { Injectable, Logger } from '@nestjs/common';

/** Minimal shape of a SerpAPI search result item — fields vary by engine */
interface SerpApiResultItem {
  title?: string;
  name?: string;
  price?: string | number | { raw?: string; value?: number };
  extracted_price?: number;
  offer_price?: string;
  link?: string;
  product_link?: string;
  url?: string;
  thumbnail?: string;
  image?: string;
  source?: string;
  seller?: string;
  shop_name?: string;
  rating?: string | number;
  min_order?: string | number;
  product_id?: string | number;
  id?: string | number;
  asin?: string;
}

/** Minimal shape of the SerpAPI JSON response */
interface SerpApiResponse {
  organic_results?: SerpApiResultItem[];
  shopping_results?: SerpApiResultItem[];
  products_results?: SerpApiResultItem[];
}

export interface SerpApiProduct {
  title: string;
  price_usd: number;
  price_local: number | null;
  currency: string;
  url: string;
  image_url: string | null;
  seller_name: string | null;
  seller_rating: number | null;
  min_order_qty: number | null;
  external_id: string | null;
  platform_code: string;
}

/**
 * SerpAPI client — covers 1688, Taobao, Alibaba, Google Shopping, Amazon.
 * Requires SERPAPI_API_KEY env var. When not set, returns empty results gracefully.
 */
@Injectable()
export class SerpApiClient {
  private readonly logger = new Logger(SerpApiClient.name);
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.SERPAPI_API_KEY;
    if (!this.apiKey) {
      this.logger.warn('SERPAPI_API_KEY not set — SerpAPI searches will be skipped');
    }
  }

  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search1688(query: string): Promise<SerpApiProduct[]> {
    return this.searchEngine(query, '1688', '1688');
  }

  async searchTaobao(query: string): Promise<SerpApiProduct[]> {
    return this.searchEngine(query, 'taobao', 'taobao');
  }

  async searchAlibaba(query: string): Promise<SerpApiProduct[]> {
    return this.searchEngine(query, 'alibaba', 'alibaba');
  }

  async searchGoogleShopping(query: string): Promise<SerpApiProduct[]> {
    if (!this.apiKey) return [];
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'google_shopping',
        q: query,
        num: '10',
      });
      const res = await fetch(`https://serpapi.com/search.json?${params}`);
      if (!res.ok) {
        this.logger.error(`SerpAPI google_shopping HTTP ${res.status}`);
        return [];
      }
      const data = await res.json() as SerpApiResponse;
      const results = data.shopping_results ?? [];
      return results.slice(0, 10).map((item) => ({
        title: item.title ?? '',
        price_usd: this.parsePrice(item.extracted_price ?? item.price),
        price_local: null,
        currency: 'USD',
        url: item.link ?? item.product_link ?? '',
        image_url: item.thumbnail ?? null,
        seller_name: item.source ?? null,
        seller_rating: item.rating ? parseFloat(String(item.rating)) : null,
        min_order_qty: null,
        external_id: item.product_id ? String(item.product_id) : null,
        platform_code: 'google_shopping',
      } satisfies SerpApiProduct)).filter((p) => p.title && p.price_usd > 0);
    } catch (err: unknown) {
      this.logger.error(`SerpAPI google_shopping error: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  async searchAmazonDE(query: string): Promise<SerpApiProduct[]> {
    if (!this.apiKey) return [];
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'amazon',
        amazon_domain: 'amazon.de',
        q: query,
      });
      const res = await fetch(`https://serpapi.com/search.json?${params}`);
      if (!res.ok) return [];
      const data = await res.json() as SerpApiResponse;
      const results = data.organic_results ?? [];
      return results.slice(0, 8).map((item) => {
        const priceField = item.price;
        const priceRaw = typeof priceField === 'object' && priceField !== null
          ? (priceField.raw ?? priceField.value)
          : priceField;
        return {
          title: item.title ?? '',
          price_usd: this.parsePrice(priceRaw),
          price_local: this.parsePrice(priceRaw),
          currency: 'EUR',
          url: item.link ?? '',
          image_url: item.thumbnail ?? null,
          seller_name: 'Amazon.de',
          seller_rating: item.rating ? parseFloat(String(item.rating)) : null,
          min_order_qty: null,
          external_id: item.asin ?? null,
          platform_code: 'amazon_de',
        } satisfies SerpApiProduct;
      }).filter((p) => p.title && p.price_usd > 0);
    } catch (err: unknown) {
      this.logger.error(`SerpAPI amazon_de error: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  private async searchEngine(
    query: string,
    engine: string,
    platformCode: string,
  ): Promise<SerpApiProduct[]> {
    if (!this.apiKey) return [];
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        engine,
        q: query,
        num: '10',
      });
      const res = await fetch(`https://serpapi.com/search.json?${params}`);
      if (!res.ok) {
        this.logger.error(`SerpAPI ${engine} HTTP ${res.status}`);
        return [];
      }
      const data = await res.json() as SerpApiResponse;
      const results =
        data.organic_results ??
        data.shopping_results ??
        data.products_results ??
        [];
      return results.slice(0, 10).map((item) => {
        const price = item.price ?? item.extracted_price ?? item.offer_price ?? '';
        return {
          title: item.title ?? item.name ?? '',
          price_usd: this.parsePrice(price),
          price_local: this.parsePrice(price),
          currency: platformCode === 'amazon_de' ? 'EUR' : 'CNY',
          url: item.link ?? item.product_link ?? item.url ?? '',
          image_url: item.thumbnail ?? item.image ?? null,
          seller_name: item.source ?? item.seller ?? item.shop_name ?? null,
          seller_rating: item.rating ? parseFloat(String(item.rating)) : null,
          min_order_qty: item.min_order ? parseInt(String(item.min_order)) : null,
          external_id: item.product_id != null ? String(item.product_id) : (item.id != null ? String(item.id) : null),
          platform_code: platformCode,
        } satisfies SerpApiProduct;
      }).filter((p) => p.title && p.price_usd > 0);
    } catch (err: unknown) {
      this.logger.error(`SerpAPI ${engine} error: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  private parsePrice(price: unknown): number {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      const cleaned = price.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }
}
