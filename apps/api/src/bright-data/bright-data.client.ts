import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BrightDataProduct,
  BrightDataTriggerResponse,
  BrightDataAliExpressRaw,
  BrightData1688Raw,
  BrightDataTaobaoRaw,
} from './interfaces/bright-data-product.interface';
import { PLATFORMS_CONFIG, PlatformKey, PLATFORM_KEYS } from './platforms.config';

/** Timeout for Bright Data API requests (ms) */
const REQUEST_TIMEOUT_MS = 30_000;

/** Default result limit per platform */
const DEFAULT_LIMIT = 10;

/** Max polling attempts for snapshot readiness */
const MAX_POLL_ATTEMPTS = 20;

/** Delay between polling attempts (ms) */
const POLL_DELAY_MS = 3_000;

/**
 * BrightDataClient — NestJS injectable service wrapping the Bright Data
 * Web Scraper API for product search across AliExpress, 1688, and Taobao.
 *
 * Usage:
 *   const results = await brightDataClient.searchProducts('aliexpress', 'bluetooth earbuds');
 *   const allResults = await brightDataClient.searchAllPlatforms('phone case');
 *
 * When BRIGHT_DATA_API_KEY is not set (dev environment), all methods
 * return empty arrays gracefully.
 */
@Injectable()
export class BrightDataClient {
  private readonly logger = new Logger(BrightDataClient.name);
  private readonly apiKey: string | undefined;
  private readonly datasetIds: Record<PlatformKey, string>;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('BRIGHT_DATA_API_KEY');

    if (!this.apiKey) {
      this.logger.warn(
        'BRIGHT_DATA_API_KEY not set — Bright Data searches will return empty results',
      );
    }

    // Allow dataset IDs to be overridden via env variables
    this.datasetIds = {
      aliexpress:
        this.config.get<string>('BRIGHT_DATA_DATASET_ALIEXPRESS') ??
        PLATFORMS_CONFIG.aliexpress.datasetId,
      '1688':
        this.config.get<string>('BRIGHT_DATA_DATASET_1688') ??
        PLATFORMS_CONFIG['1688'].datasetId,
      taobao:
        this.config.get<string>('BRIGHT_DATA_DATASET_TAOBAO') ??
        PLATFORMS_CONFIG.taobao.datasetId,
    };
  }

  /** Whether the client has a valid API key configured */
  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search products on a single platform via Bright Data Web Scraper API.
   *
   * Flow:
   *   1. POST trigger → get snapshot_id
   *   2. Poll GET snapshot until ready
   *   3. Fetch results and normalize to BrightDataProduct[]
   */
  async searchProducts(
    platform: PlatformKey,
    query: string,
    limit?: number,
  ): Promise<BrightDataProduct[]> {
    if (!this.apiKey) return [];

    const effectiveLimit = limit ?? DEFAULT_LIMIT;
    const datasetId = this.datasetIds[platform];

    try {
      // Step 1: Trigger the scraper
      const snapshotId = await this.triggerScrape(datasetId, query, effectiveLimit);
      if (!snapshotId) return [];

      // Step 2: Poll until snapshot is ready
      const rawResults = await this.pollSnapshot(snapshotId);
      if (!rawResults || rawResults.length === 0) return [];

      // Step 3: Normalize results
      return this.normalizeResults(platform, rawResults).slice(0, effectiveLimit);
    } catch (err: unknown) {
      this.logger.error(
        `Bright Data ${platform} search failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  /**
   * Search all platforms in parallel using Promise.allSettled.
   * Returns results grouped by platform key.
   */
  async searchAllPlatforms(
    query: string,
    limit?: number,
  ): Promise<Record<PlatformKey, BrightDataProduct[]>> {
    const results: Record<PlatformKey, BrightDataProduct[]> = {
      aliexpress: [],
      '1688': [],
      taobao: [],
    };

    if (!this.apiKey) return results;

    const settled = await Promise.allSettled(
      PLATFORM_KEYS.map(async (platform) => ({
        platform,
        products: await this.searchProducts(platform, query, limit),
      })),
    );

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results[outcome.value.platform] = outcome.value.products;
      } else {
        this.logger.error(`Bright Data allSettled rejection: ${String(outcome.reason)}`);
      }
    }

    return results;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Trigger a Bright Data scrape job and return the snapshot_id.
   */
  private async triggerScrape(
    datasetId: string,
    keyword: string,
    limit: number,
  ): Promise<string | null> {
    const url = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ keyword, limit }]),
        signal: controller.signal,
      });

      if (response.status === 401) {
        this.logger.error('Bright Data API authentication failed — check BRIGHT_DATA_API_KEY');
        return null;
      }

      if (response.status === 429) {
        this.logger.warn('Bright Data API quota exceeded — rate limited');
        return null;
      }

      if (!response.ok) {
        this.logger.error(`Bright Data trigger HTTP ${response.status}`);
        return null;
      }

      const data = (await response.json()) as BrightDataTriggerResponse;
      this.logger.debug(`Bright Data trigger OK — snapshot_id: ${data.snapshot_id}`);
      return data.snapshot_id;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Poll the Bright Data snapshot endpoint until data is ready.
   * Returns the raw JSON array from the snapshot.
   */
  private async pollSnapshot(snapshotId: string): Promise<unknown[] | null> {
    const url = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          signal: controller.signal,
        });

        // 202 = still processing
        if (response.status === 202) {
          this.logger.debug(`Snapshot ${snapshotId} not ready (attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})`);
          await this.delay(POLL_DELAY_MS);
          continue;
        }

        if (!response.ok) {
          this.logger.error(`Bright Data snapshot HTTP ${response.status}`);
          return null;
        }

        const data = (await response.json()) as unknown[];
        this.logger.debug(`Snapshot ${snapshotId} ready — ${data.length} results`);
        return data;
      } finally {
        clearTimeout(timeout);
      }
    }

    this.logger.warn(`Snapshot ${snapshotId} timed out after ${MAX_POLL_ATTEMPTS} attempts`);
    return null;
  }

  /**
   * Normalize platform-specific raw results to the common BrightDataProduct shape.
   */
  private normalizeResults(platform: PlatformKey, rawResults: unknown[]): BrightDataProduct[] {
    switch (platform) {
      case 'aliexpress':
        return this.normalizeAliExpress(rawResults as BrightDataAliExpressRaw[]);
      case '1688':
        return this.normalize1688(rawResults as BrightData1688Raw[]);
      case 'taobao':
        return this.normalizeTaobao(rawResults as BrightDataTaobaoRaw[]);
    }
  }

  private normalizeAliExpress(items: BrightDataAliExpressRaw[]): BrightDataProduct[] {
    return items
      .map((item) => {
        const price = this.toNumber(item.final_price ?? item.original_price);
        return {
          platform: 'aliexpress' as const,
          title: item.title ?? '',
          price,
          currency: item.currency ?? 'USD',
          priceUsd: price, // AliExpress prices are typically in USD
          imageUrl: item.image ?? '',
          productUrl: item.url ?? item.product_url ?? '',
          rating: this.toNumber(item.stars ?? item.rating) || undefined,
          orders: this.toNumber(item.orders ?? item.num_orders) || undefined,
          shippingCost: this.toNumber(item.shipping ?? item.shipping_cost) || undefined,
        };
      })
      .filter((p) => p.title && p.price > 0);
  }

  private normalize1688(items: BrightData1688Raw[]): BrightDataProduct[] {
    return items
      .map((item) => {
        const price = this.toNumber(item.price);
        return {
          platform: '1688' as const,
          title: item.title ?? '',
          price,
          currency: item.currency ?? 'CNY',
          priceUsd: this.convertToUsd(price, 'CNY'),
          imageUrl: item.image ?? item.image_url ?? '',
          productUrl: item.url ?? item.product_url ?? '',
          rating: this.toNumber(item.rating) || undefined,
          orders: this.toNumber(item.sold ?? item.sales) || undefined,
        };
      })
      .filter((p) => p.title && p.price > 0);
  }

  private normalizeTaobao(items: BrightDataTaobaoRaw[]): BrightDataProduct[] {
    return items
      .map((item) => {
        const price = this.toNumber(item.price);
        return {
          platform: 'taobao' as const,
          title: item.title ?? '',
          price,
          currency: item.currency ?? 'CNY',
          priceUsd: this.convertToUsd(price, 'CNY'),
          imageUrl: item.image ?? item.pic_url ?? '',
          productUrl: item.url ?? item.detail_url ?? '',
          rating: this.toNumber(item.rating) || undefined,
          orders: this.toNumber(item.sold ?? item.sales_count) || undefined,
        };
      })
      .filter((p) => p.title && p.price > 0);
  }

  /**
   * Convert a price to USD using approximate exchange rates.
   * For production accuracy, this should be replaced with real-time rates
   * from SourcingService.getCurrencyRates().
   */
  private convertToUsd(price: number, currency: string): number {
    const APPROXIMATE_RATES: Record<string, number> = {
      USD: 1,
      CNY: 0.14, // ~7.1 CNY per USD
      EUR: 1.08,
    };

    const rate = APPROXIMATE_RATES[currency] ?? 1;
    return Math.round(price * rate * 100) / 100;
  }

  /** Safely parse a value to a number */
  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  /** Promise-based delay helper */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
