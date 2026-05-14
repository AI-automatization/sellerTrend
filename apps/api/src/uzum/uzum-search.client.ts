import { Injectable, Logger } from '@nestjs/common';
import { UzumAuthClient, UZUM_HEADERS, UZUM_SERVER_IID, uzumProxyDispatcher, getImpitInstance, fetchWithTimeout } from './uzum-auth.client';

const REST_BASE = 'https://api.uzum.uz/api/v2';
const GRAPHQL_URL = 'https://graphql.uzum.uz/';

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
  photoUrl?: string;
  score?: number;
  weeklyBought?: number;
}

interface UzumApiResponse {
  payload?: { data?: unknown; products?: UzumSearchProduct[] };
  products?: UzumSearchProduct[];
  data?: { products?: UzumSearchProduct[]; total?: number };
  total?: number;
}

interface GqlSearchResponse {
  data?: {
    makeSearch?: {
      total?: number;
      items?: Array<{
        catalogCard?: {
          productId?: number; id?: number; title?: string;
          minSellPrice?: number; minFullPrice?: number; ordersQuantity?: number;
          rating?: number; feedbackQuantity?: number; photos?: Array<{ key?: string }>;
        };
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

const SEARCH_GRAPHQL_QUERY = `
query getMakeSearch($queryInput: MakeSearchQueryInput!) {
  makeSearch(query: $queryInput) {
    total
    items { catalogCard { __typename ...DefaultCardFragment } __typename }
    __typename
  }
}
fragment DefaultCardFragment on CatalogCard {
  feedbackQuantity id minFullPrice minSellPrice ordersQuantity productId rating title
  photos { key } __typename
}
`;

@Injectable()
export class UzumSearchClient {
  private readonly logger = new Logger(UzumSearchClient.name);

  constructor(private readonly authClient: UzumAuthClient) {}

  async searchProducts(query: string, size: number, offset: number): Promise<UzumSearchProduct[]> {
    const gqlResult = await this.searchProductsGraphQL(query, size, offset);
    if (gqlResult.length > 0) return gqlResult;

    if (offset === 0) {
      this.logger.warn('GraphQL search returned empty, trying REST fallback');
      return this.searchProductsREST(query, size);
    }
    return [];
  }

  async searchProductsREST(query: string, size: number): Promise<UzumSearchProduct[]> {
    const url = `${REST_BASE}/main/search/product?text=${encodeURIComponent(query)}&size=${size}&page=0&sort=BY_RELEVANCE_DESC&showAdultContent=HIDE`;
    try {
      const response = await fetchWithTimeout(url, { headers: UZUM_HEADERS, dispatcher: uzumProxyDispatcher });
      if (response.status === 429) { this.logger.warn('searchProducts REST rate limited (429)'); return []; }
      if (!response.ok) { this.logger.warn(`searchProducts REST HTTP ${response.status}`); return []; }
      const data = (await response.json()) as UzumApiResponse;
      return data?.payload?.products ?? data?.products ?? data?.data?.products ?? [];
    } catch (err: unknown) {
      this.logger.warn(`searchProducts REST failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  async searchSellers(query: string, size = 10): Promise<Array<{ id: number; title: string; ordersQuantity: number }>> {
    try {
      const products = await this.searchProducts(query, 20, 0);
      if (products.length === 0) return [];

      const ids = products.map((p) => p.productId ?? p.id).filter((id): id is number => id != null).slice(0, 10);

      // Lazy import to avoid circular dependency
      const { fetchWithTimeout: ft } = await import('./uzum-auth.client');
      const details = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await ft(`${REST_BASE}/product/${id}`, { headers: UZUM_HEADERS, dispatcher: uzumProxyDispatcher });
            if (!res.ok) return null;
            const data = (await res.json()) as { payload?: { data?: { seller?: { id?: number; title?: string; orders?: number } } } };
            return data?.payload?.data?.seller ?? null;
          } catch { return null; }
        }),
      );

      const seen = new Set<number>();
      const sellers: Array<{ id: number; title: string; ordersQuantity: number }> = [];
      for (const shop of details) {
        if (!shop?.id || !shop?.title || seen.has(shop.id)) continue;
        seen.add(shop.id);
        sellers.push({ id: shop.id, title: shop.title, ordersQuantity: shop.orders ?? 0 });
        if (sellers.length >= size) break;
      }
      return sellers;
    } catch (err: unknown) {
      this.logger.warn(`searchSellers failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  async searchCategories(query: string): Promise<Array<{ id: number; title: string }>> {
    if (!query.trim()) return [];
    try {
      const workerBase = process.env.WORKER_URL ?? `http://localhost:${process.env.WORKER_HEALTH_PORT ?? '3001'}`;
      const url = `${workerBase}/categories/search?q=${encodeURIComponent(query.trim())}`;
      const res = await fetchWithTimeout(url, {}, 8_000);
      if (!res.ok) return [];
      return (await res.json()) as Array<{ id: number; title: string }>;
    } catch (err: unknown) {
      this.logger.warn(`searchCategories failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  private async searchProductsGraphQL(query: string, limit: number, offset: number): Promise<UzumSearchProduct[]> {
    try {
      const token = await this.authClient.getAnonymousToken();
      if (!token) { this.logger.warn('No anonymous token — skipping GraphQL search'); return []; }

      const impitResult = await this.searchGraphQLViaImpit(query, limit, offset, token);
      if (impitResult.length > 0) { this.logger.log(`GraphQL search via impit: ${impitResult.length} results`); return impitResult; }

      this.logger.warn('impit returned empty, trying native fetch fallback');
      return this.searchGraphQLViaFetch(query, limit, offset, token);
    } catch (err: unknown) {
      this.logger.warn(`searchProductsGraphQL failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  private buildGraphQLRequest(query: string, limit: number, offset: number, token: string) {
    const variables = {
      queryInput: {
        text: query, showAdultContent: 'NONE', filters: [], sort: 'BY_RELEVANCE_DESC',
        pagination: { offset, limit }, correctQuery: false, getFastCategories: false,
        getPromotionItems: false, getFastFacets: false, fastFacetsLimit: 0,
      },
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
      'apollographql-client-name': 'web-customers', 'apollographql-client-version': '1.63.2',
      Origin: 'https://uzum.uz', Referer: 'https://uzum.uz/',
      'User-Agent': UZUM_HEADERS['User-Agent'], 'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept: '*/*', 'x-iid': UZUM_SERVER_IID,
    };
    const cookies = this.authClient.getCachedCookies();
    if (cookies) headers.Cookie = cookies;
    const body = JSON.stringify({ operationName: 'getMakeSearch', variables, query: SEARCH_GRAPHQL_QUERY });
    return { headers, body };
  }

  private parseGraphQLResponse(data: GqlSearchResponse): UzumSearchProduct[] {
    if (data.errors?.length) { this.logger.warn(`GraphQL errors: ${data.errors.map((e) => e.message).join(', ')}`); return []; }
    const items = data.data?.makeSearch?.items ?? [];
    return items.map((item) => {
      const card = item.catalogCard;
      if (!card) return null;
      const photoKey = card.photos?.[0]?.key;
      return {
        id: card.id ?? card.productId, productId: card.productId, title: card.title,
        minSellPrice: card.minSellPrice, sellPrice: card.minSellPrice, rating: card.rating,
        ordersQuantity: card.ordersQuantity, feedbackQuantity: card.feedbackQuantity,
        photoUrl: photoKey ? `https://images.uzum.uz/${photoKey}/original.jpg` : undefined,
      } as UzumSearchProduct;
    }).filter((p): p is UzumSearchProduct => p !== null);
  }

  private async searchGraphQLViaImpit(query: string, limit: number, offset: number, token: string): Promise<UzumSearchProduct[]> {
    const { headers, body } = this.buildGraphQLRequest(query, limit, offset, token);
    const impit = getImpitInstance();
    const res = await impit.fetch(GRAPHQL_URL, { method: 'POST', headers, body });
    if (res.status === 401) { this.authClient.invalidateToken(); this.logger.warn('GraphQL 401 via impit — token expired'); return []; }
    if (!res.ok) { this.logger.warn(`searchGraphQLViaImpit HTTP ${res.status}`); return []; }
    return this.parseGraphQLResponse((await res.json()) as GqlSearchResponse);
  }

  private async searchGraphQLViaFetch(query: string, limit: number, offset: number, token: string): Promise<UzumSearchProduct[]> {
    const { headers, body } = this.buildGraphQLRequest(query, limit, offset, token);
    const res = await fetchWithTimeout(GRAPHQL_URL, { method: 'POST', headers, body, dispatcher: uzumProxyDispatcher }, 20_000);
    if (res.status === 401) { this.authClient.invalidateToken(); this.logger.warn('GraphQL 401 via fetch — token expired'); return []; }
    if (!res.ok) { this.logger.warn(`searchGraphQLViaFetch HTTP ${res.status}`); return []; }
    return this.parseGraphQLResponse((await res.json()) as GqlSearchResponse);
  }
}
