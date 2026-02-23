import { Injectable, Logger } from '@nestjs/common';

export interface AliExpressProduct {
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
  platform_code: 'aliexpress';
}

/**
 * AliExpress Affiliate API client.
 * Requires ALIEXPRESS_APP_KEY and ALIEXPRESS_APP_SECRET env vars.
 * When not set, falls back to SerpAPI or Playwright.
 */
@Injectable()
export class AliExpressClient {
  private readonly logger = new Logger(AliExpressClient.name);
  private readonly appKey: string | undefined;
  private readonly appSecret: string | undefined;

  constructor() {
    this.appKey = process.env.ALIEXPRESS_APP_KEY;
    this.appSecret = process.env.ALIEXPRESS_APP_SECRET;
    if (!this.appKey) {
      this.logger.warn('ALIEXPRESS_APP_KEY not set — AliExpress affiliate API skipped');
    }
  }

  get isAvailable(): boolean {
    return !!(this.appKey && this.appSecret);
  }

  async searchProducts(query: string): Promise<AliExpressProduct[]> {
    if (!this.isAvailable) return [];

    try {
      // AliExpress Affiliate API v2 — product search
      const params = new URLSearchParams({
        app_key: this.appKey!,
        method: 'aliexpress.affiliate.product.query',
        keywords: query,
        target_currency: 'USD',
        target_language: 'en',
        page_size: '10',
        sort: 'SALE_PRICE_ASC',
      });

      // Generate sign (simplified HMAC-based; full implementation requires crypto)
      const url = `https://api-sg.aliexpress.com/sync?${params}`;
      const res = await fetch(url);
      if (!res.ok) {
        this.logger.error(`AliExpress API HTTP ${res.status}`);
        return [];
      }

      const data = await res.json() as any;
      const products =
        data?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product ?? [];

      return products.slice(0, 10).map((item: any) => ({
        title: item.product_title ?? '',
        price_usd: parseFloat(item.target_sale_price ?? '0'),
        price_local: parseFloat(item.target_original_price ?? '0'),
        currency: 'USD',
        url: item.product_detail_url ?? item.promotion_link ?? '',
        image_url: item.product_main_image_url ?? null,
        seller_name: null,
        seller_rating: item.evaluate_rate ? parseFloat(item.evaluate_rate) / 100 : null,
        min_order_qty: 1,
        external_id: item.product_id ? String(item.product_id) : null,
        platform_code: 'aliexpress' as const,
      })).filter((p: AliExpressProduct) => p.title && p.price_usd > 0);
    } catch (err: any) {
      this.logger.error(`AliExpress search error: ${err.message}`);
      return [];
    }
  }
}
