import { Injectable, Inject, Logger, NotFoundException, BadRequestException, forwardRef } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { UzumClient, UzumSearchProduct } from '../uzum/uzum.client';
import { BrightDataClient } from '../bright-data/bright-data.client';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { forecastEnsemble, calcWeeklyBought } from '@uzum/utils';
import { RevenueEstimateResponse } from './dto/revenue-estimate.dto';

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
  async searchProducts(query: string, limit = 24): Promise<UzumSearchProduct[]> {
    const CACHE_TTL_SECONDS = 300; // 5 minutes
    const sanitized = query.trim().slice(0, 100);
    if (sanitized.length < 2) return [];

    const cacheKey = `search:${sanitized}:${limit}`;

    // Check Redis cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as UzumSearchProduct[];
      }
    } catch (err: unknown) {
      this.logger.warn(`Redis cache read error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Fetch from Uzum API
    const results = await this.uzumClient.searchProducts(sanitized, limit, 0);

    // Cache result (only if non-empty)
    if (results.length > 0) {
      try {
        await this.redis.set(cacheKey, JSON.stringify(results), 'EX', CACHE_TTL_SECONDS);
      } catch (err: unknown) {
        this.logger.warn(`Redis cache write error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return results;
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

      // Prefer stored scraped weekly_bought; then any stored non-zero; fallback to calculated
      let weeklyBought: number | null = null;
      const scrapedSnap = snaps.find((s) => s.weekly_bought_source === 'scraped' && s.weekly_bought != null);
      if (scrapedSnap) {
        weeklyBought = scrapedSnap.weekly_bought;
      } else {
        const anyWbSnap = snaps.find((s) => s.weekly_bought != null && s.weekly_bought > 0);
        if (anyWbSnap) {
          weeklyBought = anyWbSnap.weekly_bought;
        } else {
          const currentOrders = Number(latest?.orders_quantity ?? t.product.orders_quantity ?? 0);
          const currentTime = latest?.snapshot_at?.getTime() ?? Date.now();
          weeklyBought = calcWeeklyBought(snaps, currentOrders, currentTime);
        }
      }

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
        sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
        total_available_amount: t.product.total_available_amount?.toString() ?? null,
        photo_url: t.product.photo_url ?? null,
        tracked_since: t.created_at,
      };
    });
  }

  async getProductById(productId: bigint, accountId: string) {
    // Verify the product belongs to this account
    await this.assertProductOwnership(productId, accountId);

    // Separate queries to avoid N+1 on ai_explanations (was: 20 nested includes → 20 queries)
    const [product, latestAi] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          snapshots: {
            orderBy: { snapshot_at: 'desc' },
            take: 20,
            select: {
              id: true, product_id: true, orders_quantity: true, weekly_bought: true,
              weekly_bought_source: true, rating: true, feedback_quantity: true, score: true, snapshot_at: true,
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

    // Prefer stored scraped weekly_bought; then any stored non-zero; fallback to calculated
    let weeklyBought: number | null = null;
    const scrapedSnap = snaps.find((s) => s.weekly_bought_source === 'scraped' && s.weekly_bought != null);
    if (scrapedSnap) {
      weeklyBought = scrapedSnap.weekly_bought;
    } else {
      // Use any stored non-zero weekly_bought (e.g. from 'stored_scraped' or 'calculated')
      const anyWbSnap = snaps.find((s) => s.weekly_bought != null && s.weekly_bought > 0);
      if (anyWbSnap) {
        weeklyBought = anyWbSnap.weekly_bought;
      } else {
        const currentOrders = Number(latest?.orders_quantity ?? product.orders_quantity ?? 0);
        const currentTime = latest?.snapshot_at?.getTime() ?? Date.now();
        weeklyBought = calcWeeklyBought(snaps, currentOrders, currentTime);
      }
    }

    return {
      product_id: product.id.toString(),
      title: product.title,
      rating: product.rating ? Number(product.rating) : null,
      feedback_quantity: product.feedback_quantity,
      orders_quantity: product.orders_quantity?.toString(),
      shop_name: product.shop?.title ?? null,
      score: latest?.score ? Number(latest.score) : null,
      weekly_bought: weeklyBought,
      sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
      stock_type: sku?.stock_type ?? null,
      photo_url: product.photo_url ?? null,
      total_available_amount: product.total_available_amount?.toString() ?? null,
      ai_explanation,
      last_updated: latest?.snapshot_at ?? product.updated_at,
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

    // Prefer stored scraped weekly_bought; then any stored non-zero; fallback to calculated
    let weeklyBought: number | null = null;
    const scrapedSnap = product.snapshots.find((s) => s.weekly_bought_source === 'scraped' && s.weekly_bought != null);
    if (scrapedSnap) {
      weeklyBought = scrapedSnap.weekly_bought;
    } else {
      const anyWbSnap = product.snapshots.find((s) => s.weekly_bought != null && s.weekly_bought > 0);
      if (anyWbSnap) {
        weeklyBought = anyWbSnap.weekly_bought;
      } else {
        const currentOrders = Number(latest?.orders_quantity ?? product.orders_quantity ?? 0);
        const currentTime = latest?.snapshot_at?.getTime() ?? Date.now();
        weeklyBought = calcWeeklyBought(product.snapshots, currentOrders, currentTime);
      }
    }

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
            orders_quantity: detail.shop.ordersQuantity,
          },
          create: {
            id: BigInt(detail.shop.id),
            title: detail.shop.title,
            rating: detail.shop.rating,
            orders_quantity: detail.shop.ordersQuantity,
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
            orders_quantity: detail.shop.ordersQuantity,
          },
          create: {
            id: BigInt(detail.shop.id),
            title: detail.shop.title,
            rating: detail.shop.rating,
            orders_quantity: detail.shop.ordersQuantity,
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
      },
      create: {
        account_id: accountId,
        product_id: productId,
        next_scrape_at: new Date(),
      },
    });
    return { ...tp, product_id: tp.product_id.toString() };
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
    const wbValues = rows.map((s) => s.weekly_bought ?? 0);
    const dates = rows.map((s) => s.snapshot_at.toISOString());

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

    // Determine weekly_bought with the same fallback logic
    let weeklyBought: number | null = null;
    const scrapedSnap = product.snapshots.find(
      (s) => s.weekly_bought_source === 'scraped' && s.weekly_bought != null,
    );
    if (scrapedSnap) {
      weeklyBought = scrapedSnap.weekly_bought;
    } else {
      const anyWbSnap = product.snapshots.find(
        (s) => s.weekly_bought != null && s.weekly_bought > 0,
      );
      if (anyWbSnap) {
        weeklyBought = anyWbSnap.weekly_bought;
      } else {
        const currentOrders = Number(latest?.orders_quantity ?? product.orders_quantity ?? 0);
        const currentTime = latest?.snapshot_at?.getTime() ?? Date.now();
        weeklyBought = calcWeeklyBought(product.snapshots, currentOrders, currentTime);
      }
    }

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
    await this.assertProductOwnership(productId, accountId);

    // Get last 14 days of snapshots for comparison
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const snapshots = await this.prisma.productSnapshot.findMany({
      where: {
        product_id: productId,
        snapshot_at: { gte: twoWeeksAgo },
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

    if (daysBetweenWeeks > 0 && weekAgoOrders >= twoWeekOrders) {
      prevWeeklySold = Math.round(((weekAgoOrders - twoWeekOrders) * 7) / daysBetweenWeeks);
    }

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

    // Daily breakdown from snapshots
    const dailyBreakdown = snapshots.slice(-8).map((snap, i, arr) => {
      const prevOrders = i > 0 ? Number(arr[i - 1].orders_quantity ?? 0) : Number(snap.orders_quantity ?? 0);
      const currOrders = Number(snap.orders_quantity ?? 0);
      const prevTime = i > 0 ? arr[i - 1].snapshot_at.getTime() : snap.snapshot_at.getTime();
      const currTime = snap.snapshot_at.getTime();
      const daysDiff = Math.max(0.5, (currTime - prevTime) / (1000 * 60 * 60 * 24));
      const dailySold = i > 0 ? Math.round((currOrders - prevOrders) / daysDiff) : 0;

      return {
        date: snap.snapshot_at.toISOString().split('T')[0],
        orders: currOrders,
        daily_sold: Math.max(0, dailySold),
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
