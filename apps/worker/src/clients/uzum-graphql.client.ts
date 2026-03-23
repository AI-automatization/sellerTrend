import { tokenManager } from './token-manager';
import { logJobInfo, logJobError } from '../logger';
import type {
  MakeSearchResult,
  SkuGroupCard,
  ProductPageResult,
  SuggestionsResult,
  SuggestionsRecommendedBlock,
  ProductRecommendationsResult,
  ProductRecommendationItem,
} from '@uzum/types';
import {
  MAKE_SEARCH_QUERY,
  PRODUCT_PAGE_QUERY,
  GET_SUGGESTIONS_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
} from '../graphql/queries';

const GRAPHQL_URL = 'https://graphql.uzum.uz/';
const LOG_CTX = 'UzumGraphQL';
const REQUEST_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WAIT_MS = 5_000;

function buildHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'Accept-Language': 'ru-RU',
    'apollographql-client-name': 'web-customers',
    'apollographql-client-version': '1.63.2',
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── In-memory monitoring counters (Section 6.4) ─────────────────────────────
interface GraphQLStats {
  requests_total: number;
  errors_total: Record<string, number>; // keyed by error type: '401','429','400','5xx','graphql','fetch'
  token_refreshes_total: number;
  latency_ms_sum: number;
  latency_ms_count: number;
}

class UzumGraphQLClient {
  private static instance: UzumGraphQLClient;

  private readonly stats: GraphQLStats = {
    requests_total: 0,
    errors_total: {},
    token_refreshes_total: 0,
    latency_ms_sum: 0,
    latency_ms_count: 0,
  };

  static getInstance(): UzumGraphQLClient {
    if (!UzumGraphQLClient.instance) {
      UzumGraphQLClient.instance = new UzumGraphQLClient();
    }
    return UzumGraphQLClient.instance;
  }

  /** Snapshot of current monitoring counters for health check endpoint. */
  getStats() {
    const avg_latency_ms = this.stats.latency_ms_count > 0
      ? Math.round(this.stats.latency_ms_sum / this.stats.latency_ms_count)
      : 0;
    return { ...this.stats, avg_latency_ms };
  }

  private incrementError(type: string) {
    this.stats.errors_total[type] = (this.stats.errors_total[type] ?? 0) + 1;
  }

  /**
   * Generic GraphQL so'rov.
   * Token yo'q bo'lsa yoki 5xx bo'lsa — caller REST ga fallback qilishi kerak.
   */
  async query<T>(
    operationName: string,
    queryString: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const token = await tokenManager.getToken();
    if (!token) {
      this.incrementError('no_token');
      throw new Error(`GraphQL: token yo'q — REST fallback kerak (${operationName})`);
    }

    return this._execute<T>(operationName, queryString, variables, token, false);
  }

  private async _execute<T>(
    operationName: string,
    queryString: string,
    variables: Record<string, unknown> | undefined,
    token: string,
    isRetry: boolean,
  ): Promise<T> {
    const body = JSON.stringify({ operationName, query: queryString, variables: variables ?? {} });
    const startMs = Date.now();

    if (!isRetry) {
      this.stats.requests_total++;
    }

    let res: Response;
    try {
      res = await fetchWithTimeout(GRAPHQL_URL, {
        method: 'POST',
        headers: buildHeaders(token),
        body,
      });
    } catch (err) {
      this.incrementError('fetch');
      throw new Error(`GraphQL fetch xatosi (${operationName}): ${(err as Error).message}`);
    }

    // 401 — token yangilash + 1 marta retry
    if (res.status === 401 && !isRetry) {
      this.incrementError('401');
      this.stats.token_refreshes_total++;
      logJobInfo(LOG_CTX, '-', operationName, '401 — token yangilanmoqda...');
      tokenManager.clearToken();
      const newToken = await tokenManager.refreshToken();
      if (!newToken) {
        throw new Error(`GraphQL: 401, token yangilanmadi (${operationName})`);
      }
      return this._execute<T>(operationName, queryString, variables, newToken, true);
    }

    // 429 — rate limit, 1 marta kutib retry
    if (res.status === 429 && !isRetry) {
      this.incrementError('429');
      logJobInfo(LOG_CTX, '-', operationName, `429 rate limit — ${RATE_LIMIT_WAIT_MS}ms kutilmoqda`);
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
      return this._execute<T>(operationName, queryString, variables, token, true);
    }

    // 400 — query xatosi (retry qilinmaydi)
    if (res.status === 400) {
      this.incrementError('400');
      const text = await res.text().catch(() => '');
      logJobError(LOG_CTX, '-', operationName, new Error(`GraphQL 400: ${text.slice(0, 200)}`));
      throw new Error(`GraphQL query xatosi 400 (${operationName})`);
    }

    // 5xx — server xato, caller REST ga fallback qiladi
    if (res.status >= 500) {
      this.incrementError('5xx');
      throw new Error(`GraphQL server xatosi ${res.status} (${operationName})`);
    }

    const json = await res.json() as { data?: Record<string, unknown>; errors?: Array<{ message: string }> };

    if (json.errors?.length) {
      this.incrementError('graphql_error');
      const msg = json.errors[0].message;
      logJobError(LOG_CTX, '-', operationName, new Error(`GraphQL error: ${msg}`));
      throw new Error(`GraphQL error (${operationName}): ${msg}`);
    }

    if (!json.data) {
      this.incrementError('no_data');
      throw new Error(`GraphQL: data yo'q (${operationName})`);
    }

    // Track latency only on success
    const latencyMs = Date.now() - startMs;
    this.stats.latency_ms_sum += latencyMs;
    this.stats.latency_ms_count++;

    return json.data as T;
  }

  // ─── T-433: makeSearch ──────────────────────────────────────────────────────

  async searchProducts(params: {
    text?: string;
    categoryId?: number;
    sort?: string;
    offset?: number;
    limit?: number;
    filters?: Array<{ id: string; values: string[] }>;
  }): Promise<MakeSearchResult> {
    const queryInput: Record<string, unknown> = {
      text: params.text ?? '',
      showAdultContent: 'NONE',
      filters: params.filters ?? [],
      sort: params.sort ?? 'BY_ORDERS_NUMBER_DESC',
      pagination: { offset: params.offset ?? 0, limit: params.limit ?? 48 },
      correctQuery: true,
      getFastCategories: false,
      fastCategoriesLimit: 0,
      getPromotionItems: false,
      getFastFacets: false,
      fastFacetsLimit: 0,
    };
    if (params.categoryId) queryInput['categoryId'] = params.categoryId;

    const data = await this.query<{ makeSearch: MakeSearchResult }>(
      'getMakeSearch',
      MAKE_SEARCH_QUERY,
      { queryInput },
    );
    return data.makeSearch;
  }

  /** Barcha sahifalarni ketma-ket oladi (48 tadan) */
  async searchAllProducts(params: {
    text?: string;
    categoryId?: number;
    sort?: string;
    maxProducts?: number;
  }): Promise<SkuGroupCard[]> {
    const MAX = params.maxProducts ?? 500;
    const LIMIT = 48;
    const results: SkuGroupCard[] = [];
    let offset = 0;

    while (results.length < MAX) {
      const page = await this.searchProducts({ ...params, offset, limit: LIMIT });
      const cards = page.items
        .filter((item) => item.catalogCard.__typename === 'SkuGroupCard')
        .map((item) => item.catalogCard as SkuGroupCard);
      results.push(...cards);
      if (results.length >= page.total || cards.length < LIMIT) break;
      offset += LIMIT;
    }

    return results.slice(0, MAX);
  }

  // ─── T-434: productPage ─────────────────────────────────────────────────────

  async getProductPage(productId: number): Promise<ProductPageResult> {
    const data = await this.query<{ productPage: ProductPageResult }>(
      'productPage',
      PRODUCT_PAGE_QUERY,
      { id: productId },
    );
    return data.productPage;
  }

  // ─── T-437: getSuggestions ──────────────────────────────────────────────────

  async getTopProducts(limit = 45): Promise<SuggestionsRecommendedBlock['content']['content']> {
    const data = await this.query<{ getSuggestions: SuggestionsResult }>(
      'Suggestions',
      GET_SUGGESTIONS_QUERY,
      { input: { query: '', page: 0 }, limit },
    );
    const block = data.getSuggestions.blocks.find(
      (b): b is SuggestionsRecommendedBlock => b.__typename === 'RecommendedSuggestionsBlock',
    );
    return block?.content.content ?? [];
  }

  // ─── T-438: getProductRecommendations ──────────────────────────────────────

  async getSimilarProducts(productId: number, limit = 10): Promise<ProductRecommendationItem[]> {
    const data = await this.query<{ getProductRecommendations: ProductRecommendationsResult }>(
      'getProductRecommendations',
      PRODUCT_RECOMMENDATIONS_QUERY,
      { productId, limit },
    );
    return data.getProductRecommendations.blocks.flatMap((b) =>
      b.__typename === 'ProductRecommendationBlock'
        ? b.products.map((p) => ({
            productId: p.productId,
            title: p.title,
            ordersQuantity: p.ordersQuantity,
            minSellPrice: p.minSellPrice,
            rating: p.rating,
          }))
        : [],
    );
  }
}

export const uzumGraphQLClient = UzumGraphQLClient.getInstance();
