import { Injectable, Logger } from '@nestjs/common';
import { sleep } from '@uzum/utils';

const REST_BASE = 'https://api.uzum.uz/api/v2';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  Accept: 'application/json',
};

@Injectable()
export class UzumClient {
  private readonly logger = new Logger(UzumClient.name);

  /**
   * Fetch category listing via REST API
   */
  async fetchCategoryListing(
    categoryId: number,
    page: number = 0,
    retries = 3,
  ): Promise<{ items: any[]; total: number }> {
    const offset = page * 48;
    const url = `${REST_BASE}/category/${categoryId}/products?size=48&page=${page}&sort=ORDER_COUNT_DESC`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, { headers: HEADERS });

        if (response.status === 429) {
          this.logger.warn(`Rate limited (429), waiting 5s...`);
          await sleep(5000);
          continue;
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as any;
        const payload = data?.payload ?? data;
        const items = payload?.data?.products ?? payload?.products ?? [];
        const total = payload?.data?.total ?? payload?.total ?? 0;

        return { items, total };
      } catch (err) {
        this.logger.error(`fetchCategoryListing attempt ${attempt + 1}: ${err}`);
        if (attempt < retries - 1) await sleep(2000 * (attempt + 1));
      }
    }

    return { items: [], total: 0 };
  }

  /**
   * Fetch product detail via REST API.
   * Returns data normalized to match the old GraphQL shape used by uzum.service.ts
   */
  async fetchProductDetail(productId: number, retries = 3): Promise<any | null> {
    const url = `${REST_BASE}/product/${productId}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, { headers: HEADERS });

        if (response.status === 429) {
          await sleep(5000);
          continue;
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as any;
        const d = data?.payload?.data ?? null;
        if (!d) return null;

        // Normalize REST fields → service-expected shape
        const skuList = (d.skuList ?? []).map((sku: any) => {
          const full = sku.fullPrice ?? 0;
          const sell = sku.purchasePrice ?? full;
          const discountPercent = full > 0 ? Math.round(((full - sell) / full) * 100) : 0;
          return {
            id: sku.id,
            sellPrice: sell,
            fullPrice: full,
            discountPercent,
            availableAmount: sku.availableAmount ?? 0,
            stockType: sku.stock?.type ?? 'FBS',
          };
        });

        const seller = d.seller ?? null;
        const shop = seller
          ? {
              id: seller.id,
              title: seller.title,
              rating: seller.rating ?? 0,
              ordersQuantity: seller.orders ?? 0,
            }
          : null;

        return {
          id: d.id,
          title: d.title,
          rating: d.rating ?? 0,
          feedbackQuantity: d.reviewsAmount ?? 0,
          ordersQuantity: d.ordersAmount ?? 0,
          // rOrdersAmount = recent orders (best proxy for weekly_bought via REST API)
          recentOrdersAmount: d.rOrdersAmount ?? null,
          actions: { text: '' },
          skuList,
          shop,
        };
      } catch (err) {
        this.logger.error(`fetchProductDetail attempt ${attempt + 1}: ${err}`);
        if (attempt < retries - 1) await sleep(2000 * (attempt + 1));
      }
    }

    return null;
  }
}
