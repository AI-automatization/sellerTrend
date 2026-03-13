import { Injectable, Logger } from '@nestjs/common';
import { ProxyAgent } from 'undici';
import { parseUzumCategoryId, sleep } from '@uzum/utils';

/**
 * Node.js 18+ global fetch accepts `dispatcher` from undici,
 * but undici@7 / undici-types@6 have incompatible Dispatcher shapes.
 * We use a standalone interface to avoid the type conflict entirely.
 */
interface UndiciRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  dispatcher?: unknown;
}

/** Minimal Uzum SKU shape returned from REST API */
interface UzumSku {
  id?: number;
  fullPrice?: number;
  purchasePrice?: number;
  availableAmount?: number;
  stock?: { type?: string };
}

/** Minimal Uzum seller shape */
interface UzumSeller {
  id?: number;
  title?: string;
  rating?: number;
  orders?: number;
}

/** Minimal Uzum photo shape */
interface UzumPhoto {
  photo?: {
    '800'?: { high?: string };
    '240'?: { high?: string };
  };
  original?: string | { high?: string };
}

/** Minimal Uzum category shape (tree) */
interface UzumCategory {
  id?: number;
  title?: string;
  parent?: UzumCategory;
}

/** Minimal Uzum product detail (payload.data) */
interface UzumProductData {
  id?: number;
  title?: string;
  rating?: number;
  reviewsAmount?: number;
  ordersAmount?: number;
  rOrdersAmount?: number | null;
  totalAvailableAmount?: number;
  skuList?: UzumSku[];
  seller?: UzumSeller;
  photos?: UzumPhoto[];
  gallery?: Array<{ url?: string }>;
  category?: UzumCategory;
}

/** Top-level Uzum REST API response shape */
interface UzumApiResponse {
  payload?: {
    data?: UzumProductData;
    products?: UzumSearchProduct[];
  };
  products?: UzumSearchProduct[];
  data?: {
    products?: UzumSearchProduct[];
    total?: number;
  };
  total?: number;
}

/** Minimal product item returned in search/listing results */
export interface UzumSearchProduct {
  id?: number;
  productId?: number;
  title?: string;
  minSellPrice?: number;
  sellPrice?: number;
  rating?: number;
  ordersQuantity?: number;
  ordersAmount?: number;
}

/** Normalized product shape returned by fetchProductDetail */
export interface UzumNormalizedProduct {
  id: number;
  title: string;
  rating: number;
  feedbackQuantity: number;
  ordersQuantity: number;
  rOrdersAmount: number | null;
  totalAvailableAmount: number;
  photoUrl: string | null;
  skuList: Array<{
    id: number;
    sellPrice: number;
    fullPrice: number;
    discountPercent: number;
    availableAmount: number;
    stockType: string;
  }>;
  shop: {
    id: number;
    title: string;
    rating: number;
    ordersQuantity: number;
  } | null;
}

const REST_BASE = 'https://api.uzum.uz/api/v2';

// Cast to `unknown` to avoid undici@7 vs undici-types@6 Dispatcher mismatch
const proxyDispatcher: unknown = process.env.PROXY_URL
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

/** Fetch with AbortController timeout (default 15s) */
async function fetchWithTimeout(
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

      const res = await fetchWithTimeout(searchUrl, { headers: HEADERS, dispatcher: proxyDispatcher });
      if (!res.ok) return null;

      const data = (await res.json()) as UzumApiResponse;
      const products: UzumSearchProduct[] =
        data?.payload?.products ?? data?.products ?? data?.data?.products ?? [];
      if (products.length === 0) return null;

      // Fetch full product detail for first result to get category tree
      const productId = products[0]?.id ?? products[0]?.productId;
      if (!productId) return null;

      await this.fetchProductDetail(Number(productId));
      // detail.category comes from the raw data — need to re-fetch raw
      const rawRes = await fetchWithTimeout(`${REST_BASE}/product/${productId}`, { headers: HEADERS, dispatcher: proxyDispatcher });
      if (!rawRes.ok) return null;

      const raw = (await rawRes.json()) as UzumApiResponse;
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
    } catch (err: unknown) {
      this.logger.error(`resolveBySlugSearch failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** Walk category tree (leaf → root) and return id of category matching the slug */
  private findCategoryBySlug(cat: UzumCategory | undefined | null, slug: string): number | null {
    if (!cat) return null;
    // Normalize: category title → slug-like string
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9а-яёа-яёіїє]+/gi, '-').replace(/-+/g, '-');

    const slugClean = slug.replace(/--\d+$/, '').toLowerCase();
    let current: UzumCategory | undefined = cat;
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
  ): Promise<UzumSearchProduct[]> {
    const url =
      `${REST_BASE}/main/search/product` +
      `?categoryId=${categoryId}&size=${size}&page=0&sort=ORDER_COUNT_DESC&showAdultContent=HIDE`;

    try {
      const response = await (fetch as (url: string, init: UndiciRequestInit) => Promise<Response>)(
        url,
        { headers: HEADERS, dispatcher: proxyDispatcher },
      );
      if (!response.ok) {
        this.logger.warn(`fetchCategoryProducts HTTP ${response.status}`);
        return [];
      }

      const data = (await response.json()) as UzumApiResponse;
      const products: UzumSearchProduct[] =
        data?.payload?.products ?? data?.products ?? data?.data?.products ?? [];
      return products;
    } catch (err: unknown) {
      this.logger.error(`fetchCategoryProducts failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  /**
   * Search Uzum products by text query.
   * Returns items array from the search endpoint.
   * On error / rate-limit returns empty array.
   */
  async searchProducts(
    query: string,
    size: number,
    page: number,
  ): Promise<UzumSearchProduct[]> {
    const url =
      `${REST_BASE}/main/search/product` +
      `?text=${encodeURIComponent(query)}&size=${size}&page=${page}&sort=BY_RELEVANCE_DESC&showAdultContent=HIDE`;

    try {
      const response = await fetchWithTimeout(url, {
        headers: HEADERS,
        dispatcher: proxyDispatcher,
      });

      if (response.status === 429) {
        this.logger.warn('searchProducts rate limited (429)');
        return [];
      }

      if (!response.ok) {
        this.logger.warn(`searchProducts HTTP ${response.status}`);
        return [];
      }

      const data = (await response.json()) as UzumApiResponse;
      const products: UzumSearchProduct[] =
        data?.payload?.products ?? data?.products ?? data?.data?.products ?? [];
      return products;
    } catch (err: unknown) {
      this.logger.warn(
        `searchProducts failed: ${err instanceof Error ? err.message : String(err)}`,
      );
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
  ): Promise<{ items: UzumSearchProduct[]; total: number }> {
    const _offset = page * 48;
    const url = `${REST_BASE}/category/${categoryId}/products?size=48&page=${page}&sort=ORDER_COUNT_DESC`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, { headers: HEADERS, dispatcher: proxyDispatcher });

        if (response.status === 429) {
          this.logger.warn(`Rate limited (429), waiting 5s...`);
          await sleep(5000);
          continue;
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as UzumApiResponse;
        const items: UzumSearchProduct[] =
          data?.payload?.products ?? data?.data?.products ?? data?.products ?? [];
        const total: number = data?.data?.total ?? data?.total ?? 0;

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
  async fetchProductDetail(productId: number, retries = 3): Promise<UzumNormalizedProduct | null> {
    const url = `${REST_BASE}/product/${productId}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, { headers: HEADERS, dispatcher: proxyDispatcher });

        if (response.status === 429) {
          await sleep(5000);
          continue;
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as UzumApiResponse;
        const d = data?.payload?.data ?? null;
        if (!d) return null;

        // Normalize REST fields → service-expected shape
        const skuList = (d.skuList ?? []).map((sku: UzumSku) => {
          const full = sku.fullPrice ?? 0;
          const sell = sku.purchasePrice ?? full;
          const discountPercent = full > 0 ? Math.round(((full - sell) / full) * 100) : 0;
          return {
            id: sku.id ?? 0,
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
              id: seller.id ?? 0,
              title: seller.title ?? '',
              rating: seller.rating ?? 0,
              ordersQuantity: seller.orders ?? 0,
            }
          : null;

        // Extract first photo URL from photos array
        const firstPhoto = d.photos?.[0];
        const originalField = firstPhoto?.original;
        const originalUrl = typeof originalField === 'string'
          ? originalField
          : originalField?.high ?? null;
        const photoUrl: string | null =
          firstPhoto?.photo?.['800']?.high ??
          firstPhoto?.photo?.['240']?.high ??
          originalUrl ??
          d.gallery?.[0]?.url ??
          null;

        return {
          id: d.id ?? 0,
          title: d.title ?? '',
          rating: d.rating ?? 0,
          feedbackQuantity: d.reviewsAmount ?? 0,
          ordersQuantity: d.ordersAmount ?? 0,
          // rOrdersAmount = ROUNDED total orders (NOT weekly!) — faqat display uchun
          rOrdersAmount: d.rOrdersAmount ?? null,
          // totalAvailableAmount = haqiqiy ombordagi stok (sku.availableAmount = per-order limit)
          totalAvailableAmount: d.totalAvailableAmount ?? 0,
          photoUrl,
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
