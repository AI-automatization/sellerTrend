import { Injectable, Logger } from '@nestjs/common';
import { Impit } from 'impit';
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
  feedbackQuantity?: number;
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
const GRAPHQL_URL = 'https://graphql.uzum.uz/';
const AUTH_TOKEN_URL = 'https://id.uzum.uz/api/auth/token';

// Cast to `unknown` to avoid undici@7 vs undici-types@6 Dispatcher mismatch
const proxyDispatcher: unknown = process.env.PROXY_URL
  ? new ProxyAgent(process.env.PROXY_URL)
  : undefined;

/** Impit instance — Chrome TLS fingerprint to bypass Uzum 429 */
let impitInstance: Impit | null = null;
function getImpit(): Impit {
  if (!impitInstance) {
    const opts: ConstructorParameters<typeof Impit>[0] = { browser: 'chrome' };
    if (process.env.PROXY_URL) {
      opts.proxyUrl = process.env.PROXY_URL;
    }
    impitInstance = new Impit(opts);
  }
  return impitInstance;
}
// Stable x-iid per server instance — Uzum token endpoint requires this header
const SERVER_IID = process.env.UZUM_IID ?? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  Accept: 'application/json',
  'x-iid': SERVER_IID,
};

/** GraphQL search query — minimal fields for search results */
const SEARCH_GRAPHQL_QUERY = `
query getMakeSearch($queryInput: MakeSearchQueryInput!) {
  makeSearch(query: $queryInput) {
    total
    items {
      catalogCard {
        __typename
        ...DefaultCardFragment
      }
      __typename
    }
    __typename
  }
}

fragment DefaultCardFragment on CatalogCard {
  feedbackQuantity
  id
  minFullPrice
  minSellPrice
  ordersQuantity
  productId
  rating
  title
  __typename
}
`;

/** GraphQL response types */
interface GqlSearchResponse {
  data?: {
    makeSearch?: {
      total?: number;
      items?: Array<{
        catalogCard?: {
          productId?: number;
          id?: number;
          title?: string;
          minSellPrice?: number;
          minFullPrice?: number;
          ordersQuantity?: number;
          rating?: number;
          feedbackQuantity?: number;
        };
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

/** Cached anonymous token + cookies */
let cachedAnonToken: string | null = null;
let cachedAnonCookies: string | null = null;
let cachedAnonTokenExpiry = 0;

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
   * Get anonymous Uzum token for GraphQL API access.
   * Uses impit (Chrome TLS) to bypass fingerprinting.
   * Also caches Set-Cookie values — search-gateway requires them.
   * Token is cached for 5 hours (actual expiry is 6h).
   */
  private async getAnonymousToken(): Promise<string | null> {
    const now = Date.now();
    if (cachedAnonToken && cachedAnonTokenExpiry > now) {
      return cachedAnonToken;
    }

    // Try impit first (Chrome TLS fingerprint), then fall back to native fetch
    const result = await this.acquireTokenViaImpit()
      ?? await this.acquireTokenViaFetch();

    if (result) {
      cachedAnonToken = result.token;
      cachedAnonCookies = result.cookies;
      cachedAnonTokenExpiry = now + 5 * 60 * 60 * 1000;
      this.logger.log('Anonymous Uzum token acquired (cookies: ' + (result.cookies ? 'yes' : 'no') + ')');
    }

    return result?.token ?? null;
  }

  /** Acquire token + cookies via impit (Chrome TLS fingerprint) */
  private async acquireTokenViaImpit(): Promise<{ token: string; cookies: string | null } | null> {
    try {
      const impit = getImpit();
      const res = await impit.fetch(AUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          ...HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok && res.status !== 204) {
        this.logger.warn(`acquireTokenViaImpit HTTP ${res.status}`);
        return null;
      }

      return this.extractTokenAndCookies(res);
    } catch (err: unknown) {
      this.logger.warn(`acquireTokenViaImpit failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** Acquire token + cookies via native fetch (fallback) */
  private async acquireTokenViaFetch(): Promise<{ token: string; cookies: string | null } | null> {
    try {
      const res = await fetchWithTimeout(AUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          ...HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        dispatcher: proxyDispatcher,
      });

      if (!res.ok && res.status !== 204) {
        this.logger.warn(`acquireTokenViaFetch HTTP ${res.status}`);
        return null;
      }

      return this.extractTokenAndCookies(res);
    } catch (err: unknown) {
      this.logger.error(`acquireTokenViaFetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** Extract access_token and full cookie string from response */
  private async extractTokenAndCookies(res: {
    headers: { getSetCookie?: () => string[] };
    json: () => Promise<unknown>;
  }): Promise<{ token: string; cookies: string | null } | null> {
    const setCookies = res.headers.getSetCookie?.() ?? [];
    let token: string | null = null;
    const cookieParts: string[] = [];

    for (const cookie of setCookies) {
      // Collect name=value part for Cookie header
      const nameValue = cookie.split(';')[0].trim();
      if (nameValue) cookieParts.push(nameValue);

      const match = cookie.match(/access_token=([^;]+)/);
      if (match) token = match[1];
    }

    // Fallback: try response body for token
    if (!token) {
      try {
        const body = (await res.json()) as Record<string, unknown>;
        token = (body.access_token as string) ?? null;
      } catch {
        // 204 responses have no body
      }
    }

    if (!token) return null;

    const cookies = cookieParts.length > 0 ? cookieParts.join('; ') : null;
    return { token, cookies };
  }

  /**
   * Search Uzum products by text query via GraphQL API.
   * Falls back to REST if GraphQL fails.
   * Returns items array from the search endpoint.
   * On error / rate-limit returns empty array.
   */
  async searchProducts(
    query: string,
    size: number,
    _page: number,
  ): Promise<UzumSearchProduct[]> {
    // Try GraphQL first
    const gqlResult = await this.searchProductsGraphQL(query, size);
    if (gqlResult.length > 0) return gqlResult;

    // Fallback to REST (may still work for some queries)
    this.logger.warn('GraphQL search returned empty, trying REST fallback');
    return this.searchProductsREST(query, size);
  }

  /** Build GraphQL request body and headers (includes cookies if available) */
  private buildGraphQLRequest(query: string, limit: number, token: string) {
    const variables = {
      queryInput: {
        text: query,
        showAdultContent: 'NONE',
        filters: [],
        sort: 'BY_RELEVANCE_DESC',
        pagination: { offset: 0, limit },
        correctQuery: false,
        getFastCategories: false,
        getPromotionItems: false,
        getFastFacets: false,
        fastFacetsLimit: 0,
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'apollographql-client-name': 'web-customers',
      'apollographql-client-version': '1.63.2',
      Origin: 'https://uzum.uz',
      Referer: 'https://uzum.uz/',
      'User-Agent': HEADERS['User-Agent'],
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept: '*/*',
    };

    // search-gateway requires cookies from token endpoint
    if (cachedAnonCookies) {
      headers.Cookie = cachedAnonCookies;
    }

    const body = JSON.stringify({
      operationName: 'getMakeSearch',
      variables,
      query: SEARCH_GRAPHQL_QUERY,
    });

    return { headers, body };
  }

  /** Parse GraphQL search response into UzumSearchProduct[] */
  private parseGraphQLResponse(data: GqlSearchResponse): UzumSearchProduct[] {
    if (data.errors?.length) {
      this.logger.warn(`GraphQL errors: ${data.errors.map((e) => e.message).join(', ')}`);
      return [];
    }

    const items = data.data?.makeSearch?.items ?? [];
    return items
      .map((item) => {
        const card = item.catalogCard;
        if (!card) return null;
        return {
          id: card.id ?? card.productId,
          productId: card.productId,
          title: card.title,
          minSellPrice: card.minSellPrice,
          sellPrice: card.minSellPrice,
          rating: card.rating,
          ordersQuantity: card.ordersQuantity,
          feedbackQuantity: card.feedbackQuantity,
        } as UzumSearchProduct;
      })
      .filter((p): p is UzumSearchProduct => p !== null);
  }

  /** GraphQL search via impit (Chrome TLS fingerprint) */
  private async searchGraphQLViaImpit(
    query: string,
    limit: number,
    token: string,
  ): Promise<UzumSearchProduct[]> {
    const { headers, body } = this.buildGraphQLRequest(query, limit, token);
    const impit = getImpit();

    const res = await impit.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body,
    });

    if (res.status === 401) {
      cachedAnonToken = null;
      cachedAnonCookies = null;
      cachedAnonTokenExpiry = 0;
      this.logger.warn('GraphQL 401 via impit — token expired');
      return [];
    }

    if (!res.ok) {
      this.logger.warn(`searchGraphQLViaImpit HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as GqlSearchResponse;
    return this.parseGraphQLResponse(data);
  }

  /** GraphQL search via native fetch (fallback) */
  private async searchGraphQLViaFetch(
    query: string,
    limit: number,
    token: string,
  ): Promise<UzumSearchProduct[]> {
    const { headers, body } = this.buildGraphQLRequest(query, limit, token);

    const res = await fetchWithTimeout(
      GRAPHQL_URL,
      {
        method: 'POST',
        headers,
        body,
        dispatcher: proxyDispatcher,
      },
      20_000,
    );

    if (res.status === 401) {
      cachedAnonToken = null;
      cachedAnonCookies = null;
      cachedAnonTokenExpiry = 0;
      this.logger.warn('GraphQL 401 via fetch — token expired');
      return [];
    }

    if (!res.ok) {
      this.logger.warn(`searchGraphQLViaFetch HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as GqlSearchResponse;
    return this.parseGraphQLResponse(data);
  }

  /**
   * GraphQL-based product search.
   * Tries impit (Chrome TLS) first, falls back to native fetch.
   */
  private async searchProductsGraphQL(
    query: string,
    limit: number,
  ): Promise<UzumSearchProduct[]> {
    try {
      const token = await this.getAnonymousToken();
      if (!token) {
        this.logger.warn('No anonymous token — skipping GraphQL search');
        return [];
      }

      // impit first (Chrome TLS fingerprint bypasses 429)
      const impitResult = await this.searchGraphQLViaImpit(query, limit, token);
      if (impitResult.length > 0) {
        this.logger.log(`GraphQL search via impit: ${impitResult.length} results`);
        return impitResult;
      }

      // Fallback to native fetch (works if PROXY_URL is set)
      this.logger.warn('impit returned empty, trying native fetch fallback');
      return this.searchGraphQLViaFetch(query, limit, token);
    } catch (err: unknown) {
      this.logger.warn(
        `searchProductsGraphQL failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  /** Legacy REST-based product search (fallback) */
  private async searchProductsREST(
    query: string,
    size: number,
  ): Promise<UzumSearchProduct[]> {
    const url =
      `${REST_BASE}/main/search/product` +
      `?text=${encodeURIComponent(query)}&size=${size}&page=0&sort=BY_RELEVANCE_DESC&showAdultContent=HIDE`;

    try {
      const response = await fetchWithTimeout(url, {
        headers: HEADERS,
        dispatcher: proxyDispatcher,
      });

      if (response.status === 429) {
        this.logger.warn('searchProducts REST rate limited (429)');
        return [];
      }

      if (!response.ok) {
        this.logger.warn(`searchProducts REST HTTP ${response.status}`);
        return [];
      }

      const data = (await response.json()) as UzumApiResponse;
      const products: UzumSearchProduct[] =
        data?.payload?.products ?? data?.products ?? data?.data?.products ?? [];
      return products;
    } catch (err: unknown) {
      this.logger.warn(
        `searchProducts REST failed: ${err instanceof Error ? err.message : String(err)}`,
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
