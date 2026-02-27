import { Injectable, Logger } from '@nestjs/common';
import { ProxyAgent } from 'undici';
import { parseUzumCategoryId, sleep } from '@uzum/utils';

const REST_BASE = 'https://api.uzum.uz/api/v2';

const proxyDispatcher = process.env.PROXY_URL
  ? new ProxyAgent(process.env.PROXY_URL)
  : undefined;
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  Accept: 'application/json',
};

const HTML_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

@Injectable()
export class UzumClient {
  private readonly logger = new Logger(UzumClient.name);

  /**
   * Resolve a category ID from any Uzum input.
   *
   * uzum.uz is a pure SPA — HTML has no embedded data.
   * The category ID is always encoded in the URL itself.
   *
   * Strategy (in order):
   *  1. Plain number string → return directly
   *  2. URL with "--ID" suffix → regex extract  (fast, no network)
   *     e.g. https://uzum.uz/ru/category/smartfony--879  → 879
   *  3. URL with bare /category/{digits} path → extract
   *     e.g. https://uzum.uz/ru/category/879            → 879
   *  4. URL with slug only → search products by slug keyword,
   *     fetch first product detail, walk up its category tree
   *     to find the category matching the slug
   *     e.g. https://uzum.uz/ru/category/smartfony       → looks up
   */
  async resolveCategoryId(input: string): Promise<number | null> {
    const trimmed = input.trim();

    // 1 & 2: plain number or --ID pattern (no network needed)
    const quick = parseUzumCategoryId(trimmed);
    if (quick) return quick;

    if (!trimmed.startsWith('http')) return null;

    // 3: bare /category/{digits} in URL
    const bareId = trimmed.match(/\/category\/(\d+)(?:[/?#]|$)/);
    if (bareId) return parseInt(bareId[1], 10);

    // 4: slug-only URL → search products, get category from first result
    const slugMatch = trimmed.match(/\/category\/([^/?#]+)/);
    if (slugMatch) {
      const catId = await this.resolveBySlugSearch(slugMatch[1]);
      if (catId) return catId;
    }

    this.logger.warn(`Could not resolve category ID from: ${trimmed}`);
    return null;
  }

  /**
   * Search Uzum for products using the slug as a keyword.
   * Fetch first product detail, walk its category tree to find
   * the category whose slug/title best matches.
   */
  private async resolveBySlugSearch(slug: string): Promise<number | null> {
    try {
      // Convert slug to search keyword: "smartfony-i-aksessuary" → "smartfony i aksessuary"
      const keyword = slug.replace(/--\d+$/, '').replace(/-/g, ' ');
      this.logger.log(`Slug search: "${keyword}"`);

      const searchUrl =
        `${REST_BASE}/main/search/product` +
        `?text=${encodeURIComponent(keyword)}&size=3&sort=ORDER_COUNT_DESC&showAdultContent=HIDE`;

      const res = await fetch(searchUrl, { headers: HEADERS, dispatcher: proxyDispatcher } as any);
      if (!res.ok) return null;

      const data = (await res.json()) as any;
      const payload = data?.payload ?? data;
      const products: any[] = payload?.products ?? payload?.data?.products ?? [];
      if (products.length === 0) return null;

      // Fetch full product detail for first result to get category tree
      const productId = products[0]?.id;
      if (!productId) return null;

      const detail = await this.fetchProductDetail(Number(productId));
      // detail.category comes from the raw data — need to re-fetch raw
      const rawRes = await fetch(`${REST_BASE}/product/${productId}`, { headers: HEADERS, dispatcher: proxyDispatcher } as any);
      if (!rawRes.ok) return null;

      const raw = (await rawRes.json()) as any;
      const cat = raw?.payload?.data?.category;
      if (!cat) return null;

      // Walk up category tree: find category whose slug matches
      const target = this.findCategoryBySlug(cat, slug);
      if (target) {
        this.logger.log(`Category found by slug "${slug}": id=${target}`);
        return target;
      }

      // Fallback: return the leaf category ID
      this.logger.log(`Using leaf category ${cat.id} for slug "${slug}"`);
      return Number(cat.id);
    } catch (err: any) {
      this.logger.error(`resolveBySlugSearch failed: ${err.message}`);
      return null;
    }
  }

  /** Walk category tree (leaf → root) and return id of category matching the slug */
  private findCategoryBySlug(cat: any, slug: string): number | null {
    if (!cat) return null;
    // Normalize: category title → slug-like string
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9а-яёа-яёіїє]+/gi, '-').replace(/-+/g, '-');

    const slugClean = slug.replace(/--\d+$/, '').toLowerCase();
    let current = cat;
    while (current) {
      const titleSlug = normalize(current.title ?? '');
      if (titleSlug === slugClean || slugClean.includes(titleSlug.slice(0, 6))) {
        return Number(current.id);
      }
      current = current.parent;
    }
    return null;
  }

  /**
   * Fetch category products via the working search endpoint.
   * Uses /main/search/product?categoryId= (unlike fetchCategoryListing which uses the broken /category/{id}/products).
   */
  async fetchCategoryProducts(
    categoryId: number,
    size = 48,
  ): Promise<any[]> {
    const url =
      `${REST_BASE}/main/search/product` +
      `?categoryId=${categoryId}&size=${size}&page=0&sort=ORDER_COUNT_DESC&showAdultContent=HIDE`;

    try {
      const response = await fetch(url, { headers: HEADERS, dispatcher: proxyDispatcher } as any);
      if (!response.ok) {
        this.logger.warn(`fetchCategoryProducts HTTP ${response.status}`);
        return [];
      }

      const data = (await response.json()) as any;
      const payload = data?.payload ?? data;
      const products = payload?.products ?? payload?.data?.products ?? [];
      return products;
    } catch (err: any) {
      this.logger.error(`fetchCategoryProducts failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetch category listing via REST API (legacy — broken endpoint)
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
        const response = await fetch(url, { headers: HEADERS, dispatcher: proxyDispatcher } as any);

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
        const response = await fetch(url, { headers: HEADERS, dispatcher: proxyDispatcher } as any);

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
          // rOrdersAmount = ROUNDED total orders (NOT weekly!) — faqat display uchun
          rOrdersAmount: d.rOrdersAmount ?? null,
          // totalAvailableAmount = haqiqiy ombordagi stok (sku.availableAmount = per-order limit)
          totalAvailableAmount: d.totalAvailableAmount ?? 0,
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
