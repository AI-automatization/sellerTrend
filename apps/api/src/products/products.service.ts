import { Injectable, Inject, Logger, NotFoundException, BadRequestException, forwardRef } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { UzumClient, UzumSearchProduct } from '../uzum/uzum.client';
import { BrightDataClient } from '../bright-data/bright-data.client';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { forecastEnsemble, calcInstallmentRate, recalcWeeklyBoughtSeries } from '@uzum/utils';
import { RevenueEstimateResponse } from './dto/revenue-estimate.dto';
import { enqueueVisualSourcing } from './visual-sourcing.queue';

/**
 * So'nggi 7 kunning boshlanish sanasini qaytaradi (bugun - 7 kun).
 * weekly_bought = so'nggi 7 kun daily_orders_delta yig'indisi.
 * Mahsulot qaysi kuni kuzatuvga qo'shilgan bo'lsa ham bir xil ishlaydi.
 */
function getSevenDaysAgoUTC(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Scraped banner qiymatini fallback sifatida olish.
 * Faqat ProductSnapshotDaily da ma'lumot yo'q (yangi mahsulot) holida ishlatiladi.
 */
function getScrapedWeeklyBought(
  snaps: Array<{ weekly_bought: number | null; weekly_bought_source: string | null }>,
): number | null {
  const scraped = snaps.find((s) => s.weekly_bought_source === 'scraped' && s.weekly_bought != null);
  if (scraped) return scraped.weekly_bought;
  const any = snaps.find((s) => s.weekly_bought != null && s.weekly_bought > 0);
  return any?.weekly_bought ?? null;
}

/** Map niche keyword to Uzum category IDs */
const NICHE_CATEGORY_MAP: Record<string, number[]> = {
  kosmetika: [10012, 10091, 10165],
  elektronika: [876],
  telefon: [1001],
  kiyim: [1024],
  oziq_ovqat: [10172],
};

/** Fallback category IDs for Uzum search when no DB data found */
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
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => UzumClient))
    private readonly uzumClient: UzumClient,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly brightDataClient: BrightDataClient,
  ) {}

  /**
   * Verify that the given product is tracked by the given account.
   * Throws NotFoundException if the product does not belong to the account.
   */
  private async assertProductOwnership(productId: bigint, accountId: string): Promise<void> {
    const tracked = await this.prisma.trackedProduct.findUnique({
      where: {
        account_id_product_id: {
          account_id: accountId,
          product_id: productId,
        },
      },
      select: { id: true },
    });
    if (!tracked) {
      throw new NotFoundException('Product not found');
    }
  }

  /**
   * 4-layer fallback recommendation system for onboarding / new users.
   * Layer 1: CategoryWinner (account-specific discovery results)
   * Layer 2: Cross-account TrackedProducts matching niche
   * Layer 3: Live Uzum Search API
   * Layer 4: Hardcoded fallback category IDs
   */
  async getRecommendations(
    accountId: string,
    niche?: string,
    limit = 10,
  ): Promise<RecommendationsResult> {
    const nicheKey = niche?.toLowerCase() ?? 'default';
    const categoryIds = NICHE_CATEGORY_MAP[nicheKey] ?? [];

    // Layer 1: CategoryWinner from account's discovery runs
    if (categoryIds.length > 0) {
      const winners = await this.prisma.categoryWinner.findMany({
        where: {
          run: { account_id: accountId },
          product: {
            category_id: { in: categoryIds.map((id) => BigInt(id)) },
            is_active: true,
          },
        },
        orderBy: { rank: 'asc' },
        take: limit,
        select: {
          product: {
            select: {
              id: true,
              title: true,
              photo_url: true,
              shop: { select: { title: true } },
            },
          },
          score: true,
          weekly_bought: true,
          sell_price: true,
        },
      });

      if (winners.length > 0) {
        return {
          source: 'category_winner',
          products: winners.map((w) => ({
            product_id: w.product.id.toString(),
            title: w.product.title,
            score: w.score ? Number(w.score) : null,
            weekly_bought: w.weekly_bought,
            sell_price: w.sell_price ? Number(w.sell_price) : null,
            photo_url: w.product.photo_url,
            shop_name: w.product.shop?.title ?? null,
          })),
          total: winners.length,
        };
      }
    }

    // Layer 2: Cross-account tracked products matching niche categories
    if (categoryIds.length > 0) {
      const tracked = await this.prisma.trackedProduct.findMany({
        where: {
          is_active: true,
          product: {
            category_id: { in: categoryIds.map((id) => BigInt(id)) },
            is_active: true,
          },
        },
        distinct: ['product_id'],
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          product: {
            select: {
              id: true,
              title: true,
              photo_url: true,
              shop: { select: { title: true } },
              snapshots: {
                orderBy: { snapshot_at: 'desc' },
                take: 1,
                select: { score: true, weekly_bought: true },
              },
              skus: {
                where: { is_available: true },
                orderBy: { min_sell_price: 'asc' },
                take: 1,
                select: { min_sell_price: true },
              },
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
              product_id: t.product.id.toString(),
              title: t.product.title,
              score: snap?.score ? Number(snap.score) : null,
              weekly_bought: snap?.weekly_bought ?? null,
              sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
              photo_url: t.product.photo_url,
              shop_name: t.product.shop?.title ?? null,
            };
          }),
          total: tracked.length,
        };
      }
    }

    // Layer 3: Live Uzum search API
    const searchCategoryIds = categoryIds.length > 0
      ? categoryIds
      : (FALLBACK_PRODUCTS[nicheKey] ?? FALLBACK_PRODUCTS['default']);

    try {
      for (const catId of searchCategoryIds) {
        const items = await this.uzumClient.fetchCategoryProducts(catId, limit);
        if (items.length > 0) {
          return {
            source: 'uzum_search',
            products: items.slice(0, limit).map((item) => ({
              product_id: String(item.id ?? item.productId ?? 0),
              title: item.title ?? '',
              score: null,
              weekly_bought: null,
              sell_price: item.minSellPrice ?? item.sellPrice ?? null,
              photo_url: null,
              shop_name: null,
            })),
            total: items.length,
          };
        }
      }
    } catch (err: unknown) {
      this.logger.warn(`Uzum search failed for recommendations: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Layer 4: Hardcoded fallback (return category IDs so frontend knows which to browse)
    const fallbackIds = FALLBACK_PRODUCTS[nicheKey] ?? FALLBACK_PRODUCTS['default'];
    return {
      source: 'fallback',
      products: fallbackIds.map((catId) => ({
        product_id: String(catId),
        title: `Category ${catId}`,
        score: null,
        weekly_bought: null,
        sell_price: null,
        photo_url: null,
        shop_name: null,
      })),
      total: fallbackIds.length,
    };
  }

  /** Search Uzum products by text query with 5-min Redis cache */
  /** Log a search query (fire-and-forget, non-blocking) */
  logSearch(accountId: string, query: string, resultsCount: number): void {
    this.prisma.searchLog.create({
      data: {
        account_id: accountId,
        query: query.trim().toLowerCase(),
        results: resultsCount,
      },
    }).catch((err: unknown) => {
      this.logger.warn(`Failed to log search: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  /** Mark the latest untracked search for this account as converted (fire-and-forget) */
  markSearchTracked(accountId: string): void {
    this.prisma.searchLog.updateMany({
      where: {
        account_id: accountId,
        tracked: false,
      },
      data: { tracked: true },
    }).catch((err: unknown) => {
      this.logger.warn(`Failed to mark search tracked: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  async searchProducts(query: string, limit = 24, offset = 0): Promise<UzumSearchProduct[]> {
    const CACHE_TTL_SECONDS = 300; // 5 minutes
    const sanitized = query.trim().slice(0, 100);
    if (sanitized.length < 2) return [];

    const cacheKey = `search:${sanitized}:${limit}:${offset}`;

    // Check Redis cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as UzumSearchProduct[];
      }
    } catch (err: unknown) {
      this.logger.warn(`Redis cache read error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Try Uzum GraphQL/REST API first
    const results = await this.uzumClient.searchProducts(sanitized, limit, offset);

    if (results.length > 0) {
      const enriched = await this.enrichWithScores(results);
      this.cacheResults(cacheKey, enriched, CACHE_TTL_SECONDS);
      return enriched;
    }

    // Fallback: search our local Product database (only for first page)
    if (offset === 0) {
      this.logger.log(`Uzum API empty, falling back to DB search for "${sanitized}"`);
      const dbResults = await this.searchProductsDB(sanitized, limit);
      if (dbResults.length > 0) {
        this.cacheResults(cacheKey, dbResults, CACHE_TTL_SECONDS);
      }
      return dbResults;
    }

    return [];
  }

  /** Search products in our PostgreSQL database using ILIKE */
  private async searchProductsDB(query: string, limit: number): Promise<UzumSearchProduct[]> {
    try {
      const keywords = query.split(/\s+/).filter((k) => k.length >= 2);
      if (keywords.length === 0) return [];

      // Build ILIKE conditions for each keyword
      const where = {
        AND: keywords.map((kw) => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { title_uz: { contains: kw, mode: 'insensitive' as const } },
          ],
        })),
        is_active: true,
      };

      const products = await this.prisma.product.findMany({
        where,
        select: {
          id: true,
          title: true,
          rating: true,
          orders_quantity: true,
          feedback_quantity: true,
          photo_url: true,
          skus: {
            select: { min_sell_price: true },
            take: 1,
            orderBy: { min_sell_price: 'asc' },
          },
          snapshots: {
            select: { score: true, weekly_bought: true },
            orderBy: { snapshot_at: 'desc' },
            take: 1,
          },
        },
        orderBy: { orders_quantity: 'desc' },
        take: limit,
      });

      return products.map((p) => {
        const snap = p.snapshots[0];
        return {
          id: Number(p.id),
          productId: Number(p.id),
          title: p.title,
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

  /** Enrich Uzum API search results with score + weekly_bought from our DB */
  private async enrichWithScores(results: UzumSearchProduct[]): Promise<UzumSearchProduct[]> {
    const ids = results
      .map((r) => r.productId ?? r.id)
      .filter((id): id is number => id != null);
    if (ids.length === 0) return results;

    try {
      const dbRows = await this.prisma.product.findMany({
        where: { id: { in: ids.map(BigInt) } },
        select: {
          id: true,
          snapshots: {
            select: { score: true, weekly_bought: true },
            orderBy: { snapshot_at: 'desc' },
            take: 1,
          },
        },
      });

      const scoreMap = new Map<number, { score?: number; weeklyBought?: number }>();
      for (const row of dbRows) {
        const snap = row.snapshots[0];
        scoreMap.set(Number(row.id), {
          score: snap?.score ? Number(snap.score) : undefined,
          weeklyBought: snap?.weekly_bought ?? undefined,
        });
      }

      return results.map((r) => {
        const key = r.productId ?? r.id;
        const extra = key != null ? scoreMap.get(key) : undefined;
        return extra ? { ...r, ...extra } : r;
      });
    } catch {
      return results;
    }
  }

  private cacheResults(key: string, results: UzumSearchProduct[], ttl: number): void {
    this.redis.set(key, JSON.stringify(results), 'EX', ttl).catch((err: unknown) => {
      this.logger.warn(`Redis cache write error: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  /**
   * Sourcing comparison: search AliExpress, 1688, and Taobao for similar products
   * using the tracked product's title as the search query.
   */
  async getSourcingComparison(productId: bigint, accountId: string) {
    // Verify product belongs to this account
    const tracked = await this.prisma.trackedProduct.findFirst({
      where: {
        product_id: productId,
        account_id: accountId,
        is_active: true,
      },
      include: {
        product: {
          select: { title: true, title_uz: true },
        },
      },
    });

    if (!tracked) {
      throw new NotFoundException('Product not found or not tracked');
    }

    const query = tracked.product.title ?? tracked.product.title_uz ?? '';
    if (!query) {
      throw new BadRequestException('Product has no title for sourcing search');
    }

    const SOURCING_LIMIT = 10;
    const platforms = await this.brightDataClient.searchAllPlatforms(query, SOURCING_LIMIT);

    return {
      productId: productId.toString(),
      query,
      platforms,
      searchedAt: new Date().toISOString(),
    };
  }

  async getTrackedProducts(accountId: string) {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
          include: {
            snapshots: {
              orderBy: { snapshot_at: 'desc' },
              take: 20,
              select: {
                id: true, product_id: true, orders_quantity: true, weekly_bought: true,
                weekly_bought_source: true, rating: true, feedback_quantity: true, score: true, snapshot_at: true,
                uzum_card_price: true, uzum_card_discount: true, seller_discount: true,
                is_best_price: true, delivery_type: true, delivery_date: true,
              },
            },
            skus: {
              where: { is_available: true },
              orderBy: { min_sell_price: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    // So'nggi 7 kun daily_orders_delta yig'indisi
    const mondayUTC = getSevenDaysAgoUTC();
    const productIds = tracked.map((t) => t.product.id);
    const weeklyDailyRows = productIds.length > 0
      ? await this.prisma.productSnapshotDaily.findMany({
          where: { product_id: { in: productIds }, day: { gte: mondayUTC } },
          select: { product_id: true, daily_orders_delta: true, day: true },
        })
      : [];

    // product_id → haftalik sotuv yig'indisi
    const weeklyMap = new Map<bigint, number>();
    // product_id → eng so'nggi kun (day) va uning daily_orders_delta
    const dailyLatestDay = new Map<bigint, Date>();
    const dailyMap = new Map<bigint, number | null>();
    for (const row of weeklyDailyRows) {
      if (row.daily_orders_delta != null) {
        const current = weeklyMap.get(row.product_id) ?? 0;
        weeklyMap.set(row.product_id, current + Number(row.daily_orders_delta));
      }
      // Eng so'nggi kunni saqlash
      const prevDay = dailyLatestDay.get(row.product_id);
      if (!prevDay || row.day > prevDay) {
        dailyLatestDay.set(row.product_id, row.day);
        dailyMap.set(row.product_id, row.daily_orders_delta != null ? Number(row.daily_orders_delta) : null);
      }
    }

    return tracked.map((t) => {
      const snaps = t.product.snapshots; // DESC order
      const latest = snaps[0];
      const sku = t.product.skus[0];

      // Score trend from last two snapshots with meaningful gap
      const prev = snaps.length > 1 ? snaps[1] : null;
      const latestScore = latest?.score ? Number(latest.score) : null;
      const prevScore = prev?.score ? Number(prev.score) : null;
      const trend =
        latestScore !== null && prevScore !== null
          ? latestScore > prevScore + 0.05
            ? 'up'
            : latestScore < prevScore - 0.05
            ? 'down'
            : 'flat'
          : null;

      // Haftalik sotuv:
      // 1-hafta (kuzatuvga qo'shilganidan 7 kun o'tguncha) → Uzum banneri (scraped)
      // 7 kundan keyin → bizning so'nggi 7 kun daily_orders_delta yig'indisi
      const trackedDays = (Date.now() - t.created_at.getTime()) / (1000 * 60 * 60 * 24);
      const weeklyFromDaily = weeklyMap.get(t.product.id) ?? 0;
      const weeklyBought = trackedDays >= 7
        ? (weeklyFromDaily > 0 ? weeklyFromDaily : null)
        : getScrapedWeeklyBought(snaps);

      // Kunlik sotuv: product_snapshot_daily dan kechagi calendar-day delta (T-506)
      const daily_sold = dailyMap.get(t.product.id) ?? null;

      return {
        product_id: t.product.id.toString(),
        title: t.product.title,
        rating: t.product.rating,
        feedback_quantity: t.product.feedback_quantity,
        orders_quantity: t.product.orders_quantity?.toString(),
        score: latestScore,
        prev_score: prevScore,
        trend,
        weekly_bought: weeklyBought,
        daily_sold,
        sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
        total_available_amount: t.product.total_available_amount?.toString() ?? null,
        photo_url: t.product.photo_url ?? null,
        tracked_since: t.created_at,
        uzum_card_price: latest?.uzum_card_price ? Number(latest.uzum_card_price) : null,
        uzum_card_discount: latest?.uzum_card_discount ?? null,
        seller_discount: latest?.seller_discount ?? null,
        is_best_price: latest?.is_best_price ?? null,
        delivery_type: latest?.delivery_type ?? null,
        delivery_date: latest?.delivery_date ?? null,
      };
    });
  }

  async getProductById(productId: bigint, accountId: string) {
    // Verify the product belongs to this account
    await this.assertProductOwnership(productId, accountId);

    // Separate queries to avoid N+1 on ai_explanations (was: 20 nested includes → 20 queries)
    const [product, latestAi, trackedProduct] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          snapshots: {
            orderBy: { snapshot_at: 'desc' },
            take: 20,
            select: {
              id: true, product_id: true, orders_quantity: true, weekly_bought: true,
              weekly_bought_source: true, rating: true, feedback_quantity: true, score: true, snapshot_at: true,
              uzum_card_price: true, uzum_card_discount: true, seller_discount: true,
              is_best_price: true, delivery_type: true, delivery_date: true,
            },
          },
          skus: {
            where: { is_available: true },
            orderBy: { min_sell_price: 'asc' },
            take: 1,
          },
          shop: true,
        },
      }),
      this.prisma.productAiExplanation.findFirst({
        where: { product_id: productId },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.trackedProduct.findFirst({
        where: { product_id: productId, account_id: accountId },
        select: { created_at: true },
      }),
    ]);

    if (!product) return null;

    const snaps = product.snapshots; // DESC order
    const latest = snaps[0];
    const sku = product.skus[0];
    const aiRaw = latestAi?.explanation;
    let ai_explanation: string[] | null = null;
    if (aiRaw) {
      try {
        ai_explanation = JSON.parse(aiRaw);
      } catch {
        ai_explanation = [aiRaw];
      }
    }

    // Haftalik sotuv:
    // 1-hafta → Uzum banneri, 7 kundan keyin → bizning 7 kunlik yig'indi
    const sevenDaysAgo = getSevenDaysAgoUTC();
    const weeklyDailyRows = await this.prisma.productSnapshotDaily.findMany({
      where: { product_id: productId, day: { gte: sevenDaysAgo } },
      select: { daily_orders_delta: true, day: true },
      orderBy: { day: 'desc' },
    });
    const weeklyFromDaily = weeklyDailyRows.reduce(
      (sum, r) => sum + (r.daily_orders_delta != null ? Number(r.daily_orders_delta) : 0), 0,
    );
    const trackedDaysProduct = trackedProduct
      ? (Date.now() - trackedProduct.created_at.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    // T-510: 3 kundan kam valid daily data bo'lsa scraped ga fallback
    const daysWithData = weeklyDailyRows.filter(r => r.daily_orders_delta != null).length;
    const weeklyBought = (trackedDaysProduct >= 7 && daysWithData >= 3)
      ? (weeklyFromDaily > 0 ? weeklyFromDaily : null)
      : getScrapedWeeklyBought(snaps);

    // Kunlik sotuv: product_snapshot_daily dan eng so'nggi kunlik calendar-day delta (T-506)
    const latestDailyRow = weeklyDailyRows[0];
    const daily_sold = latestDailyRow?.daily_orders_delta != null
      ? Number(latestDailyRow.daily_orders_delta)
      : null;

    return {
      product_id: product.id.toString(),
      title: product.title,
      rating: product.rating ? Number(product.rating) : null,
      feedback_quantity: product.feedback_quantity,
      orders_quantity: product.orders_quantity?.toString(),
      shop_name: product.shop?.title ?? null,
      score: latest?.score ? Number(latest.score) : null,
      weekly_bought: weeklyBought,
      daily_sold,
      sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
      stock_type: sku?.stock_type ?? null,
      photo_url: product.photo_url ?? null,
      total_available_amount: product.total_available_amount?.toString() ?? null,
      ai_explanation,
      last_updated: latest?.snapshot_at ?? product.updated_at,
      uzum_card_price: latest?.uzum_card_price ? Number(latest.uzum_card_price) : null,
      uzum_card_discount: latest?.uzum_card_discount ?? null,
      seller_discount: latest?.seller_discount ?? null,
      is_best_price: latest?.is_best_price ?? null,
      delivery_type: latest?.delivery_type ?? null,
      delivery_date: latest?.delivery_date ?? null,
    };
  }

  /**
   * Public product lookup — returns minimal score data without account ownership check.
   * Used by Chrome extension quick-score endpoints only.
   */
  async getProductQuickScore(productId: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        snapshots: {
          orderBy: { snapshot_at: 'desc' },
          take: 5,
          select: {
            score: true, weekly_bought: true, weekly_bought_source: true,
            orders_quantity: true, snapshot_at: true,
          },
        },
        skus: {
          where: { is_available: true },
          orderBy: { min_sell_price: 'asc' },
          take: 1,
        },
      },
    });

    if (!product) return null;

    const latest = product.snapshots[0];
    const sku = product.skus[0];

    const weeklyBought = getScrapedWeeklyBought(product.snapshots);

    return {
      product_id: product.id.toString(),
      title: product.title,
      score: latest?.score ? Number(latest.score) : null,
      weekly_bought: weeklyBought,
      sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
      photo_url: product.photo_url ?? null,
      last_updated: latest?.snapshot_at ?? product.updated_at,
    };
  }

  /**
   * Track a product from search results.
   * If the Product doesn't exist in our DB yet, fetch it from Uzum API
   * and create the Product (+ Shop) record first, then link TrackedProduct.
   */
  async trackFromSearch(accountId: string, uzumProductId: number): Promise<{
    product_id: string;
    title: string;
    is_new: boolean;
  }> {
    const productBigInt = BigInt(uzumProductId);

    // Check if Product already exists in our DB
    const existing = await this.prisma.product.findUnique({
      where: { id: productBigInt },
      select: { id: true, title: true },
    });

    let title: string;
    if (existing) {
      title = existing.title;
    } else {
      // Product not in DB — fetch from Uzum API
      const detail = await this.uzumClient.fetchProductDetail(uzumProductId);
      if (!detail) {
        throw new NotFoundException(`Product ${uzumProductId} not found on Uzum`);
      }

      // Upsert shop first (FK constraint)
      if (detail.shop) {
        await this.prisma.shop.upsert({
          where: { id: BigInt(detail.shop.id) },
          update: {
            title: detail.shop.title,
            rating: detail.shop.rating,
            orders_quantity: BigInt(detail.shop.ordersQuantity ?? 0),
          },
          create: {
            id: BigInt(detail.shop.id),
            title: detail.shop.title,
            rating: detail.shop.rating,
            orders_quantity: BigInt(detail.shop.ordersQuantity ?? 0),
          },
        });
      }

      // Create Product record
      const totalAvailable = detail.totalAvailableAmount != null
        ? BigInt(detail.totalAvailableAmount)
        : null;

      await this.prisma.product.create({
        data: {
          id: productBigInt,
          title: detail.title,
          rating: detail.rating,
          feedback_quantity: detail.feedbackQuantity,
          orders_quantity: BigInt(detail.ordersQuantity ?? 0),
          total_available_amount: totalAvailable,
          photo_url: detail.photoUrl ?? undefined,
          shop_id: detail.shop ? BigInt(detail.shop.id) : undefined,
        },
      });

      title = detail.title;
      this.logger.log(`Created product ${uzumProductId} from search track`);
    }

    // Now create TrackedProduct link
    await this.trackProduct(accountId, productBigInt);

    return {
      product_id: productBigInt.toString(),
      title,
      is_new: !existing,
    };
  }

  async trackProduct(accountId: string, productId: bigint) {
    // Ensure the Product record exists in our DB before creating TrackedProduct (FK constraint)
    const existing = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!existing) {
      // Product not in DB — fetch from Uzum API and create it
      const detail = await this.uzumClient.fetchProductDetail(Number(productId));
      if (!detail) {
        throw new NotFoundException(
          `Product ${productId.toString()} not found on Uzum`,
        );
      }

      // Upsert shop first (FK constraint on Product → Shop)
      if (detail.shop) {
        await this.prisma.shop.upsert({
          where: { id: BigInt(detail.shop.id) },
          update: {
            title: detail.shop.title,
            rating: detail.shop.rating,
            orders_quantity: BigInt(detail.shop.ordersQuantity ?? 0),
          },
          create: {
            id: BigInt(detail.shop.id),
            title: detail.shop.title,
            rating: detail.shop.rating,
            orders_quantity: BigInt(detail.shop.ordersQuantity ?? 0),
          },
        });
      }

      // Create Product record
      const totalAvailable = detail.totalAvailableAmount != null
        ? BigInt(detail.totalAvailableAmount)
        : null;

      await this.prisma.product.create({
        data: {
          id: productId,
          title: detail.title,
          rating: detail.rating,
          feedback_quantity: detail.feedbackQuantity,
          orders_quantity: BigInt(detail.ordersQuantity ?? 0),
          total_available_amount: totalAvailable,
          photo_url: detail.photoUrl ?? undefined,
          shop_id: detail.shop ? BigInt(detail.shop.id) : undefined,
        },
      });

      this.logger.log(`Created product ${productId.toString()} from track endpoint`);
    }

    // Create/reactivate TrackedProduct with immediate scrape scheduling
    const tp = await this.prisma.trackedProduct.upsert({
      where: {
        account_id_product_id: {
          account_id: accountId,
          product_id: productId,
        },
      },
      update: {
        is_active: true,
        next_scrape_at: new Date(),
        // T-510: re-track qilganda trackedDays qaytadan 0 dan boshlansin
        created_at: new Date(),
      },
      create: {
        account_id: accountId,
        product_id: productId,
        next_scrape_at: new Date(),
      },
    });

    // Visual sourcing job — rasm mavjud bo'lsa navbatga qo'shish
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { title: true, photo_url: true },
    });
    if (product?.photo_url) {
      enqueueVisualSourcing({
        productId: Number(productId),
        productTitle: product.title,
        imageUrl: product.photo_url,
        accountId,
      }).catch((err) => this.logger.warn(`visual-sourcing enqueue failed: ${err}`));
    }

    return { ...tp, product_id: tp.product_id.toString() };
  }

  async untrackProduct(accountId: string, productId: bigint) {
    await this.prisma.trackedProduct.updateMany({
      where: { account_id: accountId, product_id: productId },
      data: { is_active: false },
    });
    return { untracked: true };
  }

  async setIsMine(accountId: string, productId: bigint, isMine: boolean) {
    const tp = await this.prisma.trackedProduct.findUnique({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
    });
    if (!tp) throw new Error('Mahsulot kuzatuvda emas');
    await this.prisma.trackedProduct.update({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      data: { is_mine: isMine },
    });
    return { is_mine: isMine };
  }

  async getProductSnapshots(productId: bigint, accountId: string, limit = 30) {
    await this.assertProductOwnership(productId, accountId);

    const rows = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'desc' },
      take: limit,
      select: {
        score: true,
        weekly_bought: true,
        weekly_bought_source: true,
        orders_quantity: true,
        rating: true,
        snapshot_at: true,
      },
    });

    return rows.map((s) => ({
      score: s.score ? Number(s.score) : null,
      weekly_bought: s.weekly_bought ?? 0,
      orders_quantity: s.orders_quantity ? Number(s.orders_quantity) : null,
      rating: s.rating ? Number(s.rating) : null,
      snapshot_at: s.snapshot_at,
    }));
  }

  /**
   * 7-day score forecast using simple linear regression on snapshot history.
   */
  async getForecast(productId: bigint, accountId: string): Promise<{
    forecast_7d: number;
    trend: 'up' | 'flat' | 'down';
    slope: number;
    snapshots: Array<{ date: string; score: number }>;
  }> {
    await this.assertProductOwnership(productId, accountId);

    const rows = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'asc' },
      take: 30,
      select: { score: true, snapshot_at: true },
    });

    const snapshots = rows.map((s) => ({
      date: s.snapshot_at.toISOString(),
      score: Number(s.score ?? 0),
    }));

    if (snapshots.length < 2) {
      const latest = snapshots[0]?.score ?? 0;
      return { forecast_7d: latest, trend: 'flat', slope: 0, snapshots };
    }

    const n = snapshots.length;
    const xs = snapshots.map((_, i) => i);
    const ys = snapshots.map((s) => s.score);

    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

    const denominator = n * sumX2 - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = (sumY - slope * sumX) / n;

    const forecast7d = Math.max(0, intercept + slope * (n + 7));
    const trend: 'up' | 'flat' | 'down' =
      slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'flat';

    return {
      forecast_7d: Number(forecast7d.toFixed(4)),
      trend,
      slope: Number(slope.toFixed(6)),
      snapshots,
    };
  }

  /**
   * ML-enhanced forecast: ensemble of WMA + Holt + Linear with confidence intervals.
   * Returns forecasts for both score and weekly_bought metrics.
   */
  async getAdvancedForecast(productId: bigint, accountId: string) {
    await this.assertProductOwnership(productId, accountId);

    const rows = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'asc' },
      take: 60,
      select: { score: true, weekly_bought: true, orders_quantity: true, snapshot_at: true },
    });

    const scoreValues = rows.map((s) => Number(s.score ?? 0));
    const dates = rows.map((s) => s.snapshot_at.toISOString());
    // Use stored weekly_bought if available, otherwise fallback to recalculated delta series
    const storedWb = rows.map((s) => s.weekly_bought ?? 0);
    const recalcWb = recalcWeeklyBoughtSeries(rows);
    const wbValues = storedWb.map((v, i) => v > 0 ? v : (recalcWb[i] ?? 0));

    const scoreForecast = forecastEnsemble(scoreValues, dates, 7);
    const salesForecast = forecastEnsemble(wbValues, dates, 7);

    return {
      score_forecast: scoreForecast,
      sales_forecast: salesForecast,
      snapshots: rows.map((s, i) => ({
        date: s.snapshot_at.toISOString(),
        score: Number(s.score ?? 0),
        weekly_bought: wbValues[i],
      })),
      data_points: rows.length,
    };
  }

  /**
   * Anomaly detection: returns true if the current score is a significant spike
   * compared to the last 7 days of history (> avg + 2*stddev, and diff > 1.0).
   */
  async detectAnomaly(productId: bigint, currentScore: number): Promise<boolean> {
    const history = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'desc' },
      // Skip the very latest (just saved) and look at the 7 before it
      skip: 1,
      take: 7,
      select: { score: true },
    });

    if (history.length < 3) return false;

    const scores = history.map((s) => Number(s.score ?? 0));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    return currentScore > avg + 2 * stdDev && currentScore - avg > 1.0;
  }

  /**
   * Check alert rules for SCORE_SPIKE and fire events when anomaly detected.
   */
  async fireScoreSpikeAlerts(productId: bigint, currentScore: number, message: string) {
    const rules = await this.prisma.alertRule.findMany({
      where: { product_id: productId, rule_type: 'SCORE_SPIKE', is_active: true },
      select: { id: true },
    });

    if (rules.length === 0) return;

    await this.prisma.alertEvent.createMany({
      data: rules.map((r) => ({
        rule_id: r.id,
        product_id: productId,
        message,
      })),
    });
  }

  /**
   * Revenue estimator: calculates potential monthly revenue, margin, competition level.
   */
  async getRevenueEstimate(productId: bigint, accountId: string): Promise<RevenueEstimateResponse> {
    await this.assertProductOwnership(productId, accountId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        snapshots: {
          orderBy: { snapshot_at: 'desc' },
          take: 10,
          select: {
            score: true,
            weekly_bought: true,
            weekly_bought_source: true,
            orders_quantity: true,
            snapshot_at: true,
          },
        },
        skus: {
          where: { is_available: true },
          orderBy: { min_sell_price: 'asc' },
          take: 1,
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    const DEFAULT_MARGIN_RATE = 0.3;
    const latest = product.snapshots[0];
    const sku = product.skus[0];
    const sellPrice = sku?.min_sell_price ? Number(sku.min_sell_price) : null;
    const score = latest?.score ? Number(latest.score) : null;

    // Haftalik sotuv: 1-hafta → Uzum banneri, 7 kundan keyin → bizning 7 kunlik yig'indi
    const sevenDaysAgoEst = getSevenDaysAgoUTC();
    const [weeklyDailyRowsEst, trackedEst] = await Promise.all([
      this.prisma.productSnapshotDaily.findMany({
        where: { product_id: productId, day: { gte: sevenDaysAgoEst } },
        select: { daily_orders_delta: true },
      }),
      this.prisma.trackedProduct.findFirst({
        where: { product_id: productId, account_id: accountId },
        select: { created_at: true },
      }),
    ]);
    const weeklyFromDailyEst = weeklyDailyRowsEst.reduce(
      (sum, r) => sum + (r.daily_orders_delta != null ? Number(r.daily_orders_delta) : 0), 0,
    );
    const trackedDaysEst = trackedEst
      ? (Date.now() - trackedEst.created_at.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    const weeklyBought = trackedDaysEst >= 7
      ? (weeklyFromDailyEst > 0 ? weeklyFromDailyEst : null)
      : getScrapedWeeklyBought(product.snapshots);

    // Revenue calculations
    const WEEKS_PER_MONTH = 4;
    const estimatedMonthlyRevenue =
      sellPrice !== null && weeklyBought !== null
        ? sellPrice * weeklyBought * WEEKS_PER_MONTH
        : null;
    const estimatedMargin =
      estimatedMonthlyRevenue !== null
        ? Math.round(estimatedMonthlyRevenue * DEFAULT_MARGIN_RATE)
        : null;

    // Competition level: count active products in the same category
    let competitorsInCategory = 0;
    let competitionLevel: 'low' | 'medium' | 'high' = 'medium';

    if (product.category_id) {
      competitorsInCategory = await this.prisma.product.count({
        where: {
          category_id: product.category_id,
          is_active: true,
          id: { not: productId },
        },
      });

      const LOW_THRESHOLD = 50;
      const HIGH_THRESHOLD = 500;
      if (competitorsInCategory < LOW_THRESHOLD) {
        competitionLevel = 'low';
      } else if (competitorsInCategory >= HIGH_THRESHOLD) {
        competitionLevel = 'high';
      }
    }

    // Recommendation text
    const recommendation = this.generateRevenueRecommendation(
      score,
      estimatedMonthlyRevenue,
      competitionLevel,
      weeklyBought,
    );

    return {
      product_id: product.id.toString(),
      title: product.title,
      sell_price: sellPrice,
      weekly_bought: weeklyBought,
      estimated_monthly_revenue: estimatedMonthlyRevenue,
      estimated_margin: estimatedMargin,
      margin_rate: DEFAULT_MARGIN_RATE,
      competition_level: competitionLevel,
      competitors_in_category: competitorsInCategory,
      recommendation,
      score,
    };
  }

  private generateRevenueRecommendation(
    score: number | null,
    monthlyRevenue: number | null,
    competition: 'low' | 'medium' | 'high',
    weeklyBought: number | null,
  ): string {
    const HIGH_REVENUE_THRESHOLD = 10_000_000; // 10M so'm
    const GOOD_SCORE_THRESHOLD = 5;
    const HIGH_WEEKLY_BOUGHT = 50;

    if (score === null || monthlyRevenue === null || weeklyBought === null) {
      return "Yetarli ma'lumot yo'q. Mahsulotni kuzatishda qoldiring — 24 soatdan keyin aniqroq tahlil chiqadi.";
    }

    if (score >= GOOD_SCORE_THRESHOLD && monthlyRevenue >= HIGH_REVENUE_THRESHOLD && competition === 'low') {
      return "Ajoyib imkoniyat! Yuqori daromad, past raqobat, yaxshi skor. Bu nishani egallash uchun ideal vaqt. Stok va reklamaga sarflang.";
    }

    if (score >= GOOD_SCORE_THRESHOLD && monthlyRevenue >= HIGH_REVENUE_THRESHOLD) {
      return "Kuchli mahsulot — daromad yuqori va skor yaxshi. Raqobatga e'tibor bering va narxni barqaror tuting.";
    }

    if (competition === 'high' && weeklyBought < HIGH_WEEKLY_BOUGHT) {
      return "Raqobat yuqori, sotuv past. Narxni tushiring, rasm/tavsifni yaxshilang, yoki kamroq raqobatli niche toping.";
    }

    if (competition === 'low' && weeklyBought >= HIGH_WEEKLY_BOUGHT) {
      return "Kam raqobatli bozor, sotuv yaxshi. Stokni ko'paytiring va narxni biroz oshirishni ko'rib chiqing.";
    }

    if (monthlyRevenue < HIGH_REVENUE_THRESHOLD && score < GOOD_SCORE_THRESHOLD) {
      return "Daromad va skor past. Mahsulot strategiyasini qayta ko'rib chiqing: narx, SEO, rasm sifati, va kategoriya tanlovini tekshiring.";
    }

    return "O'rtacha natija. Doimiy kuzatishda qoldiring va raqobatchilarni tahlil qiling. Narx va reklama optimizatsiyasi bilan yaxshilash mumkin.";
  }

  /**
   * 7-day weekly trend: orders delta, sales velocity, dynamic seller advice.
   * Calculates actual weekly_bought from ordersAmount delta between snapshots.
   */
  async getWeeklyTrend(productId: bigint, accountId: string): Promise<{
    weekly_sold: number | null;
    prev_weekly_sold: number | null;
    delta: number | null;
    delta_pct: number | null;
    trend: 'up' | 'flat' | 'down';
    daily_breakdown: Array<{ date: string; orders: number; daily_sold: number }>;
    advice: { type: string; title: string; message: string; urgency: 'high' | 'medium' | 'low' };
    score_change: number | null;
    last_updated: string | null;
  }> {
    // Fetch tracking start date — snapshots BEFORE this date belong to old/other-account tracking
    // and must NOT be used for delta comparison (would produce fake -1293 badges).
    // This also replaces assertProductOwnership (ownership verified by the findUnique result).
    const trackedRow = await this.prisma.trackedProduct.findUnique({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      select: { created_at: true },
    });
    if (!trackedRow) throw new NotFoundException('Product not found');

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    // Use the later of (trackingStart, twoWeeksAgo) so we never read pre-tracking snapshots
    const snapshotsFrom = trackedRow.created_at > twoWeeksAgo ? trackedRow.created_at : twoWeeksAgo;

    const snapshots = await this.prisma.productSnapshot.findMany({
      where: {
        product_id: productId,
        snapshot_at: { gte: snapshotsFrom },
      },
      orderBy: { snapshot_at: 'asc' },
      select: {
        orders_quantity: true,
        weekly_bought: true,
        score: true,
        snapshot_at: true,
      },
    });

    if (snapshots.length < 2) {
      return {
        weekly_sold: null,
        prev_weekly_sold: null,
        delta: null,
        delta_pct: null,
        trend: 'flat',
        daily_breakdown: [],
        advice: {
          type: 'info',
          title: 'Birinchi tahlil',
          message: "Hali yetarli ma'lumot yo'q. 24 soatdan keyin avtomatik yangilanadi va haftalik trend ko'rsatiladi.",
          urgency: 'low',
        },
        score_change: null,
        last_updated: snapshots[snapshots.length - 1]?.snapshot_at?.toISOString() ?? null,
      };
    }

    const latest = snapshots[snapshots.length - 1];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find the snapshot closest to 7 days ago
    let weekAgoSnapshot = snapshots[0];
    for (const snap of snapshots) {
      if (snap.snapshot_at <= sevenDaysAgo) {
        weekAgoSnapshot = snap;
      }
    }

    // Calculate current week's orders delta
    const latestOrders = Number(latest.orders_quantity ?? 0);
    const weekAgoOrders = Number(weekAgoSnapshot.orders_quantity ?? 0);
    const daysSinceWeekAgo =
      (latest.snapshot_at.getTime() - weekAgoSnapshot.snapshot_at.getTime()) / (1000 * 60 * 60 * 24);

    let weeklySold: number | null = null;
    if (daysSinceWeekAgo > 0 && latestOrders >= weekAgoOrders) {
      weeklySold = Math.round(((latestOrders - weekAgoOrders) * 7) / daysSinceWeekAgo);
    }
    // Fallback: use stored weekly_bought when order-delta is unavailable OR zero (stale data)
    if ((weeklySold === null || weeklySold === 0) && latest.weekly_bought != null && latest.weekly_bought > 0) {
      weeklySold = latest.weekly_bought;
    }

    // Find the snapshot closest to 14 days ago for prev week comparison
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    let twoWeekAgoSnapshot = snapshots[0];
    for (const snap of snapshots) {
      if (snap.snapshot_at <= fourteenDaysAgo) {
        twoWeekAgoSnapshot = snap;
      }
    }

    let prevWeeklySold: number | null = null;
    const twoWeekOrders = Number(twoWeekAgoSnapshot.orders_quantity ?? 0);
    const daysBetweenWeeks =
      (weekAgoSnapshot.snapshot_at.getTime() - twoWeekAgoSnapshot.snapshot_at.getTime()) / (1000 * 60 * 60 * 24);

    // Haqiqiy "o'tgan hafta" snapshoti mavjud bo'lsagina hisoblash.
    // Agar twoWeekAgoSnapshot === weekAgoSnapshot (bir xil snapshot), real data yo'q — prevWeeklySold = null.
    const hasRealPrevData = daysBetweenWeeks > 1;
    if (hasRealPrevData && weekAgoOrders >= twoWeekOrders) {
      prevWeeklySold = Math.round(((weekAgoOrders - twoWeekOrders) * 7) / daysBetweenWeeks);
    }
    // NOTE: No fallback to weekly_bought for prevWeeklySold.
    // Scraped weekly_bought values can differ wildly between snapshots (e.g. 1471 vs 178),
    // causing a fake -1293 delta badge on newly tracked products. Only use actual orders_quantity
    // delta for prev-week comparison; if it's not calculable, prevWeeklySold stays null → no badge.

    // Delta
    const delta = weeklySold != null && prevWeeklySold != null
      ? weeklySold - prevWeeklySold
      : null;
    const deltaPct = delta != null && prevWeeklySold != null && prevWeeklySold > 0
      ? Number(((delta / prevWeeklySold) * 100).toFixed(1))
      : null;

    // Trend
    const trend: 'up' | 'flat' | 'down' =
      delta != null && delta > 5 ? 'up' :
      delta != null && delta < -5 ? 'down' : 'flat';

    // Daily breakdown: group snapshots by day (keep max orders per day) → 1 entry per day
    const dayMap = new Map<string, { orders: number; snapshot_at: Date }>();
    for (const snap of snapshots) {
      const day = snap.snapshot_at.toISOString().split('T')[0];
      const curr = Number(snap.orders_quantity ?? 0);
      const existing = dayMap.get(day);
      if (!existing || curr > existing.orders) {
        dayMap.set(day, { orders: curr, snapshot_at: snap.snapshot_at });
      }
    }
    const dayEntries = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8); // last 8 distinct days

    const dailyBreakdown = dayEntries.map(([date, val], i, arr) => {
      const prevOrders = i > 0 ? arr[i - 1][1].orders : val.orders;
      const dailySold = i > 0 ? Math.max(0, val.orders - prevOrders) : 0;
      return {
        date,
        orders: val.orders,
        daily_sold: dailySold,
      };
    });

    // Score change
    const latestScore = Number(latest.score ?? 0);
    const weekAgoScore = Number(weekAgoSnapshot.score ?? 0);
    const scoreChange = latestScore - weekAgoScore;

    // Dynamic seller advice
    const advice = generateSellerAdvice(weeklySold, prevWeeklySold, delta, deltaPct, trend, latestScore);

    return {
      weekly_sold: weeklySold,
      prev_weekly_sold: prevWeeklySold,
      delta,
      delta_pct: deltaPct,
      trend,
      daily_breakdown: dailyBreakdown.slice(1), // Skip first (no delta)
      advice,
      score_change: scoreChange !== 0 ? Number(scoreChange.toFixed(4)) : null,
      last_updated: latest.snapshot_at.toISOString(),
    };
  }

  /**
   * Bugungi kunlik sotuvni kechagi bilan taqqoslash.
   * So'nggi 3 snapshot asosida: bugun_delta vs kecha_delta.
   */
  async getDailyComparison(productId: bigint, accountId: string): Promise<{
    today_sold: number | null;
    yesterday_sold: number | null;
    delta: number | null;
    delta_pct: number | null;
    trend: 'up' | 'flat' | 'down';
    today_date: string | null;
    yesterday_date: string | null;
    last_updated: string | null;
  }> {
    await this.assertProductOwnership(productId, accountId);

    const snapshots = await this.prisma.productSnapshot.findMany({
      where: {
        product_id: productId,
        snapshot_at: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { snapshot_at: 'asc' },
      select: { orders_quantity: true, snapshot_at: true },
    });

    if (snapshots.length < 2) {
      return {
        today_sold: null,
        yesterday_sold: null,
        delta: null,
        delta_pct: null,
        trend: 'flat',
        today_date: snapshots[snapshots.length - 1]?.snapshot_at.toISOString().split('T')[0] ?? null,
        yesterday_date: null,
        last_updated: snapshots[snapshots.length - 1]?.snapshot_at.toISOString() ?? null,
      };
    }

    const calcDelta = (curr: typeof snapshots[0], prev: typeof snapshots[0]): number => {
      const daysDiff = Math.max(0.5, (curr.snapshot_at.getTime() - prev.snapshot_at.getTime()) / (1000 * 60 * 60 * 24));
      const ordersDiff = Math.max(0, Number(curr.orders_quantity ?? 0) - Number(prev.orders_quantity ?? 0));
      return Math.round(ordersDiff / daysDiff);
    };

    const latest = snapshots[snapshots.length - 1];
    const prev1 = snapshots[snapshots.length - 2];
    const todaySold = calcDelta(latest, prev1);

    let yesterdaySold: number | null = null;
    if (snapshots.length >= 3) {
      const prev2 = snapshots[snapshots.length - 3];
      yesterdaySold = calcDelta(prev1, prev2);
    }

    const delta = yesterdaySold !== null ? todaySold - yesterdaySold : null;
    const deltaPct =
      delta !== null && yesterdaySold !== null && yesterdaySold > 0
        ? Number(((delta / yesterdaySold) * 100).toFixed(1))
        : null;

    const trend: 'up' | 'flat' | 'down' =
      delta !== null && delta > 2 ? 'up' :
      delta !== null && delta < -2 ? 'down' : 'flat';

    return {
      today_sold: todaySold,
      yesterday_sold: yesterdaySold,
      delta,
      delta_pct: deltaPct,
      trend,
      today_date: latest.snapshot_at.toISOString().split('T')[0],
      yesterday_date: prev1.snapshot_at.toISOString().split('T')[0],
      last_updated: latest.snapshot_at.toISOString(),
    };
  }

  /**
   * Kunlik sotuv tarixi — so'nggi 30 kun, ProductSnapshotDaily dan.
   * T-497: Bright Data ordersAmount delta → daily_orders_delta.
   */
  async getDailySalesHistory(productId: bigint, accountId: string): Promise<Array<{
    date: string;
    daily_orders_delta: number | null;
    max_orders: number | null;
    avg_score: number | null;
  }>> {
    await this.assertProductOwnership(productId, accountId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.productSnapshotDaily.findMany({
      where: {
        product_id: productId,
        day: { gte: thirtyDaysAgo },
      },
      orderBy: { day: 'asc' },
      select: {
        day: true,
        daily_orders_delta: true,
        max_orders: true,
        avg_score: true,
      },
    });

    return rows.map((r) => ({
      date: r.day.toISOString().split('T')[0],
      daily_orders_delta: r.daily_orders_delta != null ? Number(r.daily_orders_delta) : null,
      max_orders: r.max_orders != null ? Number(r.max_orders) : null,
      avg_score: r.avg_score != null ? Number(r.avg_score) : null,
    }));
  }

  /**
   * Installment data for all SKUs of a product (T-436).
   * Returns latest SkuSnapshot installment fields with calculated markup rates.
   */
  async getInstallments(productId: bigint, accountId: string) {
    await this.assertProductOwnership(productId, accountId);

    const skus = await this.prisma.sku.findMany({
      where: { product_id: productId },
      select: {
        id: true,
        min_sell_price: true,
        sku_snapshots: {
          orderBy: { snapshot_at: 'desc' },
          take: 1,
          select: {
            sell_price: true,
            installment_3m: true,
            installment_6m: true,
            installment_12m: true,
            installment_24m: true,
            snapshot_at: true,
          },
        },
      },
    });

    return skus
      .filter((s) => s.sku_snapshots.length > 0)
      .map((s) => {
        const snap = s.sku_snapshots[0];
        const price = Number(snap.sell_price ?? s.min_sell_price ?? 0);
        const toNum = (v: bigint | null): number | null => v != null ? Number(v) : null;

        const monthly3  = toNum(snap.installment_3m);
        const monthly6  = toNum(snap.installment_6m);
        const monthly12 = toNum(snap.installment_12m);
        const monthly24 = toNum(snap.installment_24m);

        return {
          sku_id: s.id.toString(),
          sell_price: price,
          installments: {
            m3:  monthly3  != null ? { monthly: monthly3,  total: monthly3  * 3,  rate: calcInstallmentRate(price, monthly3,  3)  } : null,
            m6:  monthly6  != null ? { monthly: monthly6,  total: monthly6  * 6,  rate: calcInstallmentRate(price, monthly6,  6)  } : null,
            m12: monthly12 != null ? { monthly: monthly12, total: monthly12 * 12, rate: calcInstallmentRate(price, monthly12, 12) } : null,
            m24: monthly24 != null ? { monthly: monthly24, total: monthly24 * 24, rate: calcInstallmentRate(price, monthly24, 24) } : null,
          },
          snapshot_at: snap.snapshot_at,
        };
      });
  }
}

/**
 * Generate dynamic seller advice based on weekly trend data.
 */
function generateSellerAdvice(
  weeklySold: number | null,
  prevWeeklySold: number | null,
  delta: number | null,
  deltaPct: number | null,
  trend: 'up' | 'flat' | 'down',
  score: number,
): { type: string; title: string; message: string; urgency: 'high' | 'medium' | 'low' } {

  // Strong growth
  if (trend === 'up' && delta != null && delta > 50) {
    return {
      type: 'growth',
      title: "Kuchli o'sish!",
      message: `Haftalik sotuv +${delta} ta o'sdi (${deltaPct != null ? deltaPct + '%' : ''}). Bu mahsulotga talab oshmoqda. Stokni ko'paytiring va narxni biroz oshirishni ko'rib chiqing — talab yuqori bo'lganda margin yaxshilash imkoniyati.`,
      urgency: 'high',
    };
  }

  // Moderate growth
  if (trend === 'up' && delta != null && delta > 10) {
    return {
      type: 'growth',
      title: 'Sotuv o\'smoqda',
      message: `Haftalik sotuv +${delta} ta. Barqaror o'sish ko'rsatmoqda. Reklama xarajatlarini oshirib, o'sishni tezlashtirish mumkin. FBO ombori bo'lsa, stok yetarliligini tekshiring.`,
      urgency: 'medium',
    };
  }

  // Stable sales
  if (trend === 'flat' && weeklySold != null && weeklySold > 20) {
    return {
      type: 'stable',
      title: 'Barqaror sotuv',
      message: `Haftalik ${weeklySold} ta sotuv — barqaror darajada. Raqobatchilarga e'tibor bering: agar ular narx tushirsa, siz ham moslashishingiz kerak bo'ladi.`,
      urgency: 'low',
    };
  }

  // Declining sales
  if (trend === 'down' && delta != null && delta < -20) {
    return {
      type: 'decline',
      title: 'Sotuv tushmoqda!',
      message: `Haftalik sotuv ${delta} ta kamaydi (${deltaPct != null ? deltaPct + '%' : ''}). Shoshilinch: narxni qayta ko'rib chiqing, rasm va tavsifni yangilang, yoki aksiya e'lon qiling. Raqiblar narx tushirgan bo'lishi mumkin.`,
      urgency: 'high',
    };
  }

  // Moderate decline
  if (trend === 'down') {
    return {
      type: 'decline',
      title: 'Sekinlashish',
      message: `Sotuv biroz kamaymoqda. Raqiblar narxini tekshiring va mahsulot rasmlarini yangilang. Mavsumiy o'zgarish bo'lishi ham mumkin.`,
      urgency: 'medium',
    };
  }

  // Low sales
  if (weeklySold != null && weeklySold < 5) {
    return {
      type: 'low',
      title: 'Past sotuv',
      message: `Haftalik faqat ${weeklySold} ta sotuv. Narxni pasaytiring, SEO sarlavhani optimallang, yoki Uzum reklamasini yoqing. Raqobatli kategoriyada bo'lsangiz niche topishga harakat qiling.`,
      urgency: 'medium',
    };
  }

  // First analysis / not enough data
  if (weeklySold == null) {
    return {
      type: 'info',
      title: "Ma'lumot to'planmoqda",
      message: "Tizim 24 soatdan keyin avtomatik qayta tahlil qiladi. Shu vaqtda haftalik trend va maslahatlar paydo bo'ladi.",
      urgency: 'low',
    };
  }

  // Default: high score product
  if (score >= 5) {
    return {
      type: 'success',
      title: 'Yaxshi natija',
      message: `Mahsulot yaxshi ko'rsatkich ko'rsatmoqda. Hozirgi strategiyani davom ettiring va stokni nazorat qiling.`,
      urgency: 'low',
    };
  }

  return {
    type: 'info',
    title: 'Tahlil davom etmoqda',
    message: 'Tizim har 24 soatda mahsulotni qayta tahlil qiladi. Trend ma\'lumotlari to\'planmoqda.',
    urgency: 'low',
  };
}
