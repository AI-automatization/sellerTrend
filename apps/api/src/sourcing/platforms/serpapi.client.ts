import { Injectable, Logger } from '@nestjs/common';

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
      const data = await res.json() as any;
      const results = data.shopping_results ?? [];
      return results.slice(0, 10).map((item: any) => ({
        title: item.title ?? '',
        price_usd: this.parsePrice(item.extracted_price ?? item.price),
        price_local: null,
        currency: 'USD',
        url: item.link ?? item.product_link ?? '',
        image_url: item.thumbnail ?? null,
        seller_name: item.source ?? null,
        seller_rating: item.rating ? parseFloat(item.rating) : null,
        min_order_qty: null,
        external_id: item.product_id ?? null,
        platform_code: 'google_shopping',
      })).filter((p: SerpApiProduct) => p.title && p.price_usd > 0);
    } catch (err: any) {
      this.logger.error(`SerpAPI google_shopping error: ${err.message}`);
      return [];
    }
  }

  async searchAmazonDE(query: string): Promise<SerpApiProduct[]> {
    if (!this.apiKey) return [];
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'google_shopping',
        q: query + ' site:amazon.de',
        num: '8',
        gl: 'de',
      });
      const res = await fetch(`https://serpapi.com/search.json?${params}`);
      if (!res.ok) return [];
      const data = await res.json() as any;
      const results = data.shopping_results ?? [];
      return results.slice(0, 8).map((item: any) => ({
        title: item.title ?? '',
        price_usd: this.parsePrice(item.extracted_price ?? item.price),
        price_local: this.parsePrice(item.extracted_price ?? item.price),
        currency: 'EUR',
        url: item.link ?? item.product_link ?? '',
        image_url: item.thumbnail ?? null,
        seller_name: item.source ?? 'Amazon.de',
        seller_rating: item.rating ? parseFloat(item.rating) : null,
        min_order_qty: null,
        external_id: item.product_id ?? null,
        platform_code: 'amazon_de',
      })).filter((p: SerpApiProduct) => p.title && p.price_usd > 0);
    } catch (err: any) {
      this.logger.error(`SerpAPI amazon_de error: ${err.message}`);
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
      const data = await res.json() as any;
      const results =
        data.organic_results ??
        data.shopping_results ??
        data.products_results ??
        [];
      return results.slice(0, 10).map((item: any) => {
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
          external_id: item.product_id ?? item.id ?? null,
          platform_code: platformCode,
        };
      }).filter((p: SerpApiProduct) => p.title && p.price_usd > 0);
    } catch (err: any) {
      this.logger.error(`SerpAPI ${engine} error: ${err.message}`);
      return [];
    }
  }

  private parsePrice(price: any): number {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      const cleaned = price.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }
}
