import { Injectable, Logger } from '@nestjs/common';
import { parseUzumCategoryId, sleep } from '@uzum/utils';
import { UZUM_HEADERS, uzumProxyDispatcher, fetchWithTimeout } from './uzum-auth.client';
import { UzumSearchClient, UzumSearchProduct } from './uzum-search.client';

export { UzumSearchProduct } from './uzum-search.client';

interface UzumSku {
  id?: number;
  fullPrice?: number;
  purchasePrice?: number;
  availableAmount?: number;
  stock?: { type?: string };
}

interface UzumSeller {
  id?: number;
  title?: string;
  rating?: number;
  orders?: number;
}

interface UzumPhoto {
  photo?: { '800'?: { high?: string }; '240'?: { high?: string } };
  original?: string | { high?: string };
}

interface UzumCategory {
  id?: number;
  title?: string;
  parent?: UzumCategory;
}

interface UzumProductData {
  id?: number; title?: string; rating?: number; reviewsAmount?: number;
  ordersAmount?: number; rOrdersAmount?: number | null; weeklyBought?: number | null;
  totalAvailableAmount?: number; skuList?: UzumSku[]; seller?: UzumSeller;
  photos?: UzumPhoto[]; gallery?: Array<{ url?: string }>; category?: UzumCategory;
}

interface UzumApiResponse {
  payload?: { data?: UzumProductData; products?: UzumSearchProduct[] };
  products?: UzumSearchProduct[];
  data?: { products?: UzumSearchProduct[]; total?: number };
  total?: number;
}

export interface UzumNormalizedProduct {
  id: number; title: string; rating: number; feedbackQuantity: number;
  ordersQuantity: number; rOrdersAmount: number | null; weeklyBought: number | null;
  totalAvailableAmount: number; photoUrl: string | null;
  skuList: Array<{ id: number; sellPrice: number; fullPrice: number; discountPercent: number; availableAmount: number; stockType: string }>;
  shop: { id: number; title: string; rating: number; ordersQuantity: number } | null;
}

const REST_BASE = 'https://api.uzum.uz/api/v2';

@Injectable()
export class UzumClient {
  private readonly logger = new Logger(UzumClient.name);

  constructor(private readonly searchClient: UzumSearchClient) {}

  // ── Delegation wrappers (for backwards-compat with existing consumers) ──

  searchProducts(query: string, size: number, offset: number): Promise<UzumSearchProduct[]> {
    return this.searchClient.searchProducts(query, size, offset);
  }

  searchSellers(query: string, size = 10): Promise<Array<{ id: number; title: string; ordersQuantity: number }>> {
    return this.searchClient.searchSellers(query, size);
  }

  searchCategories(query: string): Promise<Array<{ id: number; title: string }>> {
    return this.searchClient.searchCategories(query);
  }

  // ── Category resolution ──

  async resolveCategoryId(input: string): Promise<number | null> {
    const trimmed = input.trim();
    const quick = parseUzumCategoryId(trimmed);
    if (quick) return quick;
    if (!trimmed.startsWith('http')) return null;

    const bareId = trimmed.match(/\/category\/(\d+)(?:[/?#]|$)/);
    if (bareId) return parseInt(bareId[1], 10);

    const slugMatch = trimmed.match(/\/category\/([^/?#]+)/);
    if (slugMatch) {
      const catId = await this.resolveBySlugSearch(slugMatch[1]);
      if (catId) return catId;
    }

    this.logger.warn(`Could not resolve category ID from: ${trimmed}`);
    return null;
  }

  private async resolveBySlugSearch(slug: string): Promise<number | null> {
    try {
      const keyword = slug.replace(/--\d+$/, '').replace(/-/g, ' ');
      this.logger.log(`Slug search: "${keyword}"`);

      const searchUrl = `${REST_BASE}/main/search/product?text=${encodeURIComponent(keyword)}&size=3&sort=ORDER_COUNT_DESC&showAdultContent=HIDE`;
      const res = await fetchWithTimeout(searchUrl, { headers: UZUM_HEADERS, dispatcher: uzumProxyDispatcher });
      if (!res.ok) return null;

      const data = (await res.json()) as UzumApiResponse;
      const products: UzumSearchProduct[] = data?.payload?.products ?? data?.products ?? data?.data?.products ?? [];
      if (products.length === 0) return null;

      const productId = products[0]?.id ?? products[0]?.productId;
      if (!productId) return null;

      const rawRes = await fetchWithTimeout(`${REST_BASE}/product/${productId}`, { headers: UZUM_HEADERS, dispatcher: uzumProxyDispatcher });
      if (!rawRes.ok) return null;

      const raw = (await rawRes.json()) as UzumApiResponse;
      const cat = raw?.payload?.data?.category;
      if (!cat) return null;

      const target = this.findCategoryBySlug(cat, slug);
      if (target) { this.logger.log(`Category found by slug "${slug}": id=${target}`); return target; }

      this.logger.log(`Using leaf category ${cat.id} for slug "${slug}"`);
      return Number(cat.id);
    } catch (err: unknown) {
      this.logger.error(`resolveBySlugSearch failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  private findCategoryBySlug(cat: UzumCategory | undefined | null, slug: string): number | null {
    if (!cat) return null;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9а-яёа-яёіїє]+/gi, '-').replace(/-+/g, '-');
    const slugClean = slug.replace(/--\d+$/, '').toLowerCase();
    let current: UzumCategory | undefined = cat;
    while (current) {
      const titleSlug = normalize(current.title ?? '');
      if (titleSlug === slugClean || slugClean.includes(titleSlug.slice(0, 6))) return Number(current.id);
      current = current.parent;
    }
    return null;
  }

  // ── Category/Product fetching ──

  async fetchCategoryProducts(categoryId: number, size = 48): Promise<UzumSearchProduct[]> {
    const url = `${REST_BASE}/main/search/product?categoryId=${categoryId}&size=${size}&page=0&sort=ORDER_COUNT_DESC&showAdultContent=HIDE`;
    try {
      const response = await (fetch as (url: string, init: { headers: Record<string, string>; dispatcher?: unknown }) => Promise<Response>)(
        url, { headers: UZUM_HEADERS, dispatcher: uzumProxyDispatcher },
      );
      if (!response.ok) { this.logger.warn(`fetchCategoryProducts HTTP ${response.status}`); return []; }
      const data = (await response.json()) as UzumApiResponse;
      return data?.payload?.products ?? data?.products ?? data?.data?.products ?? [];
    } catch (err: unknown) {
      this.logger.error(`fetchCategoryProducts failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  async fetchCategoryListing(categoryId: number, page = 0, retries = 3): Promise<{ items: UzumSearchProduct[]; total: number }> {
    const url = `${REST_BASE}/category/${categoryId}/products?size=48&page=${page}&sort=ORDER_COUNT_DESC`;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, { headers: UZUM_HEADERS, dispatcher: uzumProxyDispatcher });
        if (response.status === 429) { this.logger.warn(`Rate limited (429), waiting 5s...`); await sleep(5000); continue; }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as UzumApiResponse;
        return {
          items: data?.payload?.products ?? data?.data?.products ?? data?.products ?? [],
          total: data?.data?.total ?? data?.total ?? 0,
        };
      } catch (err) {
        this.logger.error(`fetchCategoryListing attempt ${attempt + 1}: ${err}`);
        if (attempt < retries - 1) await sleep(2000 * (attempt + 1));
      }
    }
    return { items: [], total: 0 };
  }

  async fetchProductDetail(productId: number, retries = 3): Promise<UzumNormalizedProduct | null> {
    const url = `${REST_BASE}/product/${productId}`;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, { headers: UZUM_HEADERS, dispatcher: uzumProxyDispatcher });
        if (response.status === 429) { await sleep(5000); continue; }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as UzumApiResponse;
        const d = data?.payload?.data ?? null;
        if (!d) return null;

        const skuList = (d.skuList ?? []).map((sku: UzumSku) => {
          const full = sku.fullPrice ?? 0;
          const sell = sku.purchasePrice ?? full;
          return {
            id: sku.id ?? 0, sellPrice: sell, fullPrice: full,
            discountPercent: full > 0 ? Math.round(((full - sell) / full) * 100) : 0,
            availableAmount: sku.availableAmount ?? 0, stockType: sku.stock?.type ?? 'FBS',
          };
        });

        const seller = d.seller ?? null;
        const shop = seller ? { id: seller.id ?? 0, title: seller.title ?? '', rating: seller.rating ?? 0, ordersQuantity: seller.orders ?? 0 } : null;

        const firstPhoto = d.photos?.[0];
        const originalField = firstPhoto?.original;
        const originalUrl = typeof originalField === 'string' ? originalField : originalField?.high ?? null;
        const photoUrl: string | null = firstPhoto?.photo?.['800']?.high ?? firstPhoto?.photo?.['240']?.high ?? originalUrl ?? d.gallery?.[0]?.url ?? null;

        return {
          id: d.id ?? 0, title: d.title ?? '', rating: d.rating ?? 0,
          feedbackQuantity: d.reviewsAmount ?? 0, ordersQuantity: d.ordersAmount ?? 0,
          rOrdersAmount: d.rOrdersAmount ?? null, weeklyBought: d.weeklyBought ?? null,
          totalAvailableAmount: d.totalAvailableAmount ?? 0, photoUrl, skuList, shop,
        };
      } catch (err) {
        this.logger.error(`fetchProductDetail attempt ${attempt + 1}: ${err}`);
        if (attempt < retries - 1) await sleep(2000 * (attempt + 1));
      }
    }
    return null;
  }

  async fetchProductCategoryId(productId: number): Promise<number | null> {
    try {
      const response = await fetchWithTimeout(`${REST_BASE}/product/${productId}`, { headers: UZUM_HEADERS, dispatcher: uzumProxyDispatcher });
      if (!response.ok) return null;
      const data = (await response.json()) as UzumApiResponse;
      return data?.payload?.data?.category?.id ?? null;
    } catch {
      return null;
    }
  }
}
