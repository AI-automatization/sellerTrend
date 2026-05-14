import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { UzumClient, UzumSearchProduct } from '../uzum/uzum.client';
import { REDIS_CLIENT } from '../common/redis/redis.module';

const NICHE_CATEGORY_MAP: Record<string, number[]> = {
  kosmetika: [10012, 10091, 10165],
  elektronika: [876],
  telefon: [1001],
  kiyim: [1024],
  oziq_ovqat: [10172],
};

const FALLBACK_PRODUCTS: Record<string, number[]> = {
  kosmetika: [10012],
  elektronika: [876],
  kiyim: [1024],
  default: [10012, 876, 1024],
};

export interface RecommendationProduct {
  product_id: string;
  title: string;
  score: number | null;
  weekly_bought: number | null;
  sell_price: number | null;
  photo_url: string | null;
  shop_name: string | null;
}

export interface RecommendationsResult {
  source: string;
  products: RecommendationProduct[];
  total: number;
}

@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uzumClient: UzumClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  logSearch(accountId: string, query: string, resultsCount: number): void {
    this.prisma.searchLog.create({
      data: { account_id: accountId, query: query.trim().toLowerCase(), results: resultsCount },
    }).catch((err: unknown) => {
      this.logger.warn(`Failed to log search: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  markSearchTracked(accountId: string): void {
    this.prisma.searchLog.updateMany({
      where: { account_id: accountId, tracked: false },
      data: { tracked: true },
    }).catch((err: unknown) => {
      this.logger.warn(`Failed to mark search tracked: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  async searchProducts(query: string, limit = 24, offset = 0): Promise<UzumSearchProduct[]> {
    const CACHE_TTL_SECONDS = 300;
    const sanitized = query.trim().slice(0, 100);
    if (sanitized.length < 2) return [];

    const cacheKey = `search:${sanitized}:${limit}:${offset}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as UzumSearchProduct[];
    } catch (err: unknown) {
      this.logger.warn(`Redis cache read error: ${err instanceof Error ? err.message : String(err)}`);
    }

    const results = await this.uzumClient.searchProducts(sanitized, limit, offset);
    if (results.length > 0) {
      const enriched = await this.enrichWithScores(results);
      this.cacheResults(cacheKey, enriched, CACHE_TTL_SECONDS);
      return enriched;
    }

    if (offset === 0) {
      this.logger.log(`Uzum API empty, falling back to DB search for "${sanitized}"`);
      const dbResults = await this.searchProductsDB(sanitized, limit);
      if (dbResults.length > 0) this.cacheResults(cacheKey, dbResults, CACHE_TTL_SECONDS);
      return dbResults;
    }

    return [];
  }

  async getRecommendations(accountId: string, niche?: string, limit = 10): Promise<RecommendationsResult> {
    const nicheKey = niche?.toLowerCase() ?? 'default';
    const categoryIds = NICHE_CATEGORY_MAP[nicheKey] ?? [];

    if (categoryIds.length > 0) {
      const winners = await this.prisma.categoryWinner.findMany({
        where: { run: { account_id: accountId }, product: { category_id: { in: categoryIds.map((id) => BigInt(id)) }, is_active: true } },
        orderBy: { rank: 'asc' },
        take: limit,
        select: { product: { select: { id: true, title: true, photo_url: true, shop: { select: { title: true } } } }, score: true, weekly_bought: true, sell_price: true },
      });
      if (winners.length > 0) {
        return {
          source: 'category_winner',
          products: winners.map((w) => ({
            product_id: w.product.id.toString(), title: w.product.title,
            score: w.score ? Number(w.score) : null, weekly_bought: w.weekly_bought,
            sell_price: w.sell_price ? Number(w.sell_price) : null,
            photo_url: w.product.photo_url, shop_name: w.product.shop?.title ?? null,
          })),
          total: winners.length,
        };
      }
    }

    if (categoryIds.length > 0) {
      const tracked = await this.prisma.trackedProduct.findMany({
        where: { is_active: true, product: { category_id: { in: categoryIds.map((id) => BigInt(id)) }, is_active: true } },
        distinct: ['product_id'],
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          product: {
            select: {
              id: true, title: true, photo_url: true, shop: { select: { title: true } },
              snapshots: { orderBy: { snapshot_at: 'desc' }, take: 1, select: { score: true, weekly_bought: true } },
              skus: { where: { is_available: true }, orderBy: { min_sell_price: 'asc' }, take: 1, select: { min_sell_price: true } },
            },
          },
        },
      });
      if (tracked.length > 0) {
        return {
          source: 'tracked_popular',
          products: tracked.map((t) => {
            const snap = t.product.snapshots[0];
            const sku = t.product.skus[0];
            return {
              product_id: t.product.id.toString(), title: t.product.title,
              score: snap?.score ? Number(snap.score) : null, weekly_bought: snap?.weekly_bought ?? null,
              sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
              photo_url: t.product.photo_url, shop_name: t.product.shop?.title ?? null,
            };
          }),
          total: tracked.length,
        };
      }
    }

    const searchCategoryIds = categoryIds.length > 0 ? categoryIds : (FALLBACK_PRODUCTS[nicheKey] ?? FALLBACK_PRODUCTS['default']);
    try {
      for (const catId of searchCategoryIds) {
        const items = await this.uzumClient.fetchCategoryProducts(catId, limit);
        if (items.length > 0) {
          return {
            source: 'uzum_search',
            products: items.slice(0, limit).map((item) => ({
              product_id: String(item.id ?? item.productId ?? 0), title: item.title ?? '',
              score: null, weekly_bought: null,
              sell_price: item.minSellPrice ?? item.sellPrice ?? null, photo_url: null, shop_name: null,
            })),
            total: items.length,
          };
        }
      }
    } catch (err: unknown) {
      this.logger.warn(`Uzum search failed for recommendations: ${err instanceof Error ? err.message : String(err)}`);
    }

    const fallbackIds = FALLBACK_PRODUCTS[nicheKey] ?? FALLBACK_PRODUCTS['default'];
    return {
      source: 'fallback',
      products: fallbackIds.map((catId) => ({ product_id: String(catId), title: `Category ${catId}`, score: null, weekly_bought: null, sell_price: null, photo_url: null, shop_name: null })),
      total: fallbackIds.length,
    };
  }

  private async searchProductsDB(query: string, limit: number): Promise<UzumSearchProduct[]> {
    try {
      const keywords = query.split(/\s+/).filter((k) => k.length >= 2);
      if (keywords.length === 0) return [];
      const where = { AND: keywords.map((kw) => ({ OR: [{ title: { contains: kw, mode: 'insensitive' as const } }, { title_uz: { contains: kw, mode: 'insensitive' as const } }] })), is_active: true };
      const products = await this.prisma.product.findMany({
        where,
        select: {
          id: true, title: true, rating: true, orders_quantity: true, feedback_quantity: true, photo_url: true,
          skus: { select: { min_sell_price: true }, take: 1, orderBy: { min_sell_price: 'asc' } },
          snapshots: { select: { score: true, weekly_bought: true }, orderBy: { snapshot_at: 'desc' }, take: 1 },
        },
        orderBy: { orders_quantity: 'desc' },
        take: limit,
      });
      return products.map((p) => {
        const snap = p.snapshots[0];
        return {
          id: Number(p.id), productId: Number(p.id), title: p.title,
          minSellPrice: p.skus[0]?.min_sell_price ? Number(p.skus[0].min_sell_price) : undefined,
          sellPrice: p.skus[0]?.min_sell_price ? Number(p.skus[0].min_sell_price) : undefined,
          rating: p.rating ? Number(p.rating) : undefined,
          ordersQuantity: p.orders_quantity ? Number(p.orders_quantity) : undefined,
          feedbackQuantity: p.feedback_quantity ?? undefined,
          photoUrl: p.photo_url ?? undefined,
          score: snap?.score ? Number(snap.score) : undefined,
          weeklyBought: snap?.weekly_bought ?? undefined,
        };
      });
    } catch (err: unknown) {
      this.logger.error(`searchProductsDB failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  private async enrichWithScores(results: UzumSearchProduct[]): Promise<UzumSearchProduct[]> {
    const ids = results.map((r) => r.productId ?? r.id).filter((id): id is number => id != null);
    if (ids.length === 0) return results;
    try {
      const dbRows = await this.prisma.product.findMany({
        where: { id: { in: ids.map(BigInt) } },
        select: { id: true, snapshots: { select: { score: true, weekly_bought: true }, orderBy: { snapshot_at: 'desc' }, take: 1 } },
      });
      const scoreMap = new Map<number, { score?: number; weeklyBought?: number }>();
      for (const row of dbRows) {
        const snap = row.snapshots[0];
        scoreMap.set(Number(row.id), { score: snap?.score ? Number(snap.score) : undefined, weeklyBought: snap?.weekly_bought ?? undefined });
      }
      return results.map((r) => { const key = r.productId ?? r.id; const extra = key != null ? scoreMap.get(key) : undefined; return extra ? { ...r, ...extra } : r; });
    } catch { return results; }
  }

  private cacheResults(key: string, results: UzumSearchProduct[], ttl: number): void {
    this.redis.set(key, JSON.stringify(results), 'EX', ttl).catch((err: unknown) => {
      this.logger.warn(`Redis cache write error: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
}
