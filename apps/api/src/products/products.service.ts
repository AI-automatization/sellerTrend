import { Injectable, Inject, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { UzumClient, UzumSearchProduct } from '../uzum/uzum.client';
import { BrightDataClient } from '../bright-data/bright-data.client';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { ProductSearchService, RecommendationsResult } from './product-search.service';
import { ProductAnalyticsService } from './product-analytics.service';
import { ProductTrendService } from './product-trend.service';

function getSevenDaysAgoUTC(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getScrapedWeeklyBought(
  snaps: Array<{ weekly_bought: number | null; weekly_bought_source: string | null }>,
): number | null {
  const scraped = snaps.find((s) => s.weekly_bought_source === 'scraped' && s.weekly_bought != null);
  if (scraped) return scraped.weekly_bought;
  const any = snaps.find((s) => s.weekly_bought != null && s.weekly_bought > 0);
  return any?.weekly_bought ?? null;
}

export interface RecommendationProduct {
  product_id: string; title: string; score: number | null; weekly_bought: number | null;
  sell_price: number | null; photo_url: string | null; shop_name: string | null;
}
export { RecommendationsResult } from './product-search.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => UzumClient))
    private readonly uzumClient: UzumClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly brightDataClient: BrightDataClient,
    private readonly searchService: ProductSearchService,
    private readonly analyticsService: ProductAnalyticsService,
    private readonly trendService: ProductTrendService,
  ) {}

  // ── Delegation ──

  searchProducts(query: string, limit?: number, offset?: number): Promise<UzumSearchProduct[]> {
    return this.searchService.searchProducts(query, limit, offset);
  }
  getRecommendations(accountId: string, niche?: string, limit?: number): Promise<RecommendationsResult> {
    return this.searchService.getRecommendations(accountId, niche, limit);
  }
  logSearch(accountId: string, query: string, resultsCount: number): void {
    return this.searchService.logSearch(accountId, query, resultsCount);
  }
  markSearchTracked(accountId: string): void {
    return this.searchService.markSearchTracked(accountId);
  }
  getProductSnapshots(productId: bigint, accountId: string, limit?: number) {
    return this.analyticsService.getProductSnapshots(productId, accountId, limit);
  }
  getForecast(productId: bigint, accountId: string) {
    return this.analyticsService.getForecast(productId, accountId);
  }
  getAdvancedForecast(productId: bigint, accountId: string) {
    return this.analyticsService.getAdvancedForecast(productId, accountId);
  }
  detectAnomaly(productId: bigint, currentScore: number) {
    return this.analyticsService.detectAnomaly(productId, currentScore);
  }
  fireScoreSpikeAlerts(productId: bigint, currentScore: number, message: string) {
    return this.analyticsService.fireScoreSpikeAlerts(productId, currentScore, message);
  }
  getDailySalesHistory(productId: bigint, accountId: string) {
    return this.analyticsService.getDailySalesHistory(productId, accountId);
  }
  getInstallments(productId: bigint, accountId: string) {
    return this.analyticsService.getInstallments(productId, accountId);
  }
  getWeeklyTrend(productId: bigint, accountId: string) {
    return this.trendService.getWeeklyTrend(productId, accountId);
  }
  getDailyComparison(productId: bigint, accountId: string) {
    return this.trendService.getDailyComparison(productId, accountId);
  }

  // ── Core methods (kept here) ──

  private async assertProductOwnership(productId: bigint, accountId: string): Promise<void> {
    const tracked = await this.prisma.trackedProduct.findUnique({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      select: { id: true },
    });
    if (!tracked) throw new NotFoundException('Product not found');
  }

  private async upsertShopAndProduct(detail: NonNullable<Awaited<ReturnType<UzumClient['fetchProductDetail']>>>, productBigInt: bigint) {
    if (detail.shop) {
      await this.prisma.shop.upsert({
        where: { id: BigInt(detail.shop.id) },
        update: { title: detail.shop.title, rating: detail.shop.rating, orders_quantity: BigInt(detail.shop.ordersQuantity ?? 0) },
        create: { id: BigInt(detail.shop.id), title: detail.shop.title, rating: detail.shop.rating, orders_quantity: BigInt(detail.shop.ordersQuantity ?? 0) },
      });
    }
    await this.prisma.product.create({
      data: {
        id: productBigInt,
        title: detail.title,
        rating: detail.rating,
        feedback_quantity: detail.feedbackQuantity,
        orders_quantity: BigInt(detail.ordersQuantity ?? 0),
        total_available_amount: detail.totalAvailableAmount != null ? BigInt(detail.totalAvailableAmount) : null,
        photo_url: detail.photoUrl ?? undefined,
        shop_id: detail.shop ? BigInt(detail.shop.id) : undefined,
      },
    });
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
                id: true, product_id: true, orders_quantity: true, weekly_bought: true, weekly_bought_source: true,
                rating: true, feedback_quantity: true, score: true, snapshot_at: true,
                uzum_card_price: true, uzum_card_discount: true, seller_discount: true,
                is_best_price: true, delivery_type: true, delivery_date: true,
              },
            },
            skus: { where: { is_available: true }, orderBy: { min_sell_price: 'asc' }, take: 1 },
          },
        },
      },
    });

    const mondayUTC = getSevenDaysAgoUTC();
    const productIds = tracked.map((t) => t.product.id);
    const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
    const todayTashkent = new Date(Date.now() + TASHKENT_OFFSET_MS);
    todayTashkent.setUTCHours(0, 0, 0, 0);
    const todayStartUtc = new Date(todayTashkent.getTime() - TASHKENT_OFFSET_MS);
    const yesterdayStartUtc = new Date(todayStartUtc.getTime() - 24 * 60 * 60 * 1000);

    const weeklyDailyRows = productIds.length > 0
      ? await this.prisma.productSnapshotDaily.findMany({
          where: { product_id: { in: productIds }, day: { gte: mondayUTC } },
          select: { product_id: true, daily_orders_delta: true, day: true, max_orders: true, avg_score: true },
        })
      : [];

    const weeklyMap = new Map<bigint, number>();
    const yesterdayMaxOrdersMap = new Map<bigint, bigint | null>();
    const scoreByDay = new Map<bigint, { day: Date; score: number }[]>();

    for (const row of weeklyDailyRows) {
      if (row.daily_orders_delta != null) weeklyMap.set(row.product_id, (weeklyMap.get(row.product_id) ?? 0) + Number(row.daily_orders_delta));
      if (row.day >= yesterdayStartUtc && row.day < todayStartUtc) yesterdayMaxOrdersMap.set(row.product_id, row.max_orders);
      if (row.avg_score != null) {
        const existing = scoreByDay.get(row.product_id) ?? [];
        existing.push({ day: row.day, score: Number(row.avg_score) });
        scoreByDay.set(row.product_id, existing);
      }
    }

    return tracked.map((t) => {
      const snaps = t.product.snapshots;
      const latest = snaps[0];
      const sku = t.product.skus[0];
      const dailyScores = (scoreByDay.get(t.product.id) ?? []).sort((a, b) => b.day.getTime() - a.day.getTime());
      const scoredSnaps = snaps.filter((s) => s.score != null);
      const latestScore = dailyScores[0]?.score ?? (scoredSnaps[0]?.score ? Number(scoredSnaps[0].score) : null);
      const prevScore = dailyScores[1]?.score ?? (scoredSnaps[1]?.score ? Number(scoredSnaps[1].score) : null);
      const trend = latestScore !== null && prevScore !== null
        ? latestScore > prevScore + 0.05 ? 'up' : latestScore < prevScore - 0.05 ? 'down' : 'flat' : null;
      const weeklyFromDaily = weeklyMap.get(t.product.id) ?? 0;
      const weeklyBought = weeklyFromDaily > 0 ? weeklyFromDaily : getScrapedWeeklyBought(snaps);
      const latestOrders = latest?.orders_quantity;
      const yesterdayMax = yesterdayMaxOrdersMap.get(t.product.id);
      const daily_sold = latestOrders != null && yesterdayMax != null ? Math.max(0, Number(latestOrders) - Number(yesterdayMax)) : null;

      return {
        product_id: t.product.id.toString(), title: t.product.title, rating: t.product.rating,
        feedback_quantity: t.product.feedback_quantity, orders_quantity: t.product.orders_quantity?.toString(),
        score: latestScore, prev_score: prevScore, trend, weekly_bought: weeklyBought, daily_sold,
        sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
        total_available_amount: t.product.total_available_amount?.toString() ?? null,
        photo_url: t.product.photo_url ?? null, tracked_since: t.created_at,
        uzum_card_price: latest?.uzum_card_price ? Number(latest.uzum_card_price) : null,
        uzum_card_discount: latest?.uzum_card_discount ?? null, seller_discount: latest?.seller_discount ?? null,
        is_best_price: latest?.is_best_price ?? null, delivery_type: latest?.delivery_type ?? null,
        delivery_date: latest?.delivery_date ?? null,
      };
    });
  }

  async getProductById(productId: bigint, accountId: string) {
    await this.assertProductOwnership(productId, accountId);
    const [product, latestAi, trackedProduct] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          snapshots: { orderBy: { snapshot_at: 'desc' }, take: 20, select: { id: true, product_id: true, orders_quantity: true, weekly_bought: true, weekly_bought_source: true, rating: true, feedback_quantity: true, score: true, snapshot_at: true, uzum_card_price: true, uzum_card_discount: true, seller_discount: true, is_best_price: true, delivery_type: true, delivery_date: true } },
          skus: { where: { is_available: true }, orderBy: { min_sell_price: 'asc' }, take: 1 },
          shop: true,
        },
      }),
      this.prisma.productAiExplanation.findFirst({ where: { product_id: productId }, orderBy: { created_at: 'desc' } }),
      this.prisma.trackedProduct.findFirst({ where: { product_id: productId, account_id: accountId }, select: { created_at: true } }),
    ]);
    if (!product) return null;

    const snaps = product.snapshots;
    const latest = snaps[0];
    const sku = product.skus[0];
    let ai_explanation: string[] | null = null;
    if (latestAi?.explanation) {
      try { ai_explanation = JSON.parse(latestAi.explanation); } catch { ai_explanation = [latestAi.explanation]; }
    }

    const sevenDaysAgo = getSevenDaysAgoUTC();
    const weeklyDailyRows = await this.prisma.productSnapshotDaily.findMany({
      where: { product_id: productId, day: { gte: sevenDaysAgo } },
      select: { daily_orders_delta: true, day: true },
      orderBy: { day: 'desc' },
    });
    const weeklyFromDaily = weeklyDailyRows.reduce((sum, r) => sum + (r.daily_orders_delta != null ? Number(r.daily_orders_delta) : 0), 0);
    const trackedDaysProduct = trackedProduct ? (Date.now() - trackedProduct.created_at.getTime()) / (1000 * 60 * 60 * 24) : 0;
    const daysWithData = weeklyDailyRows.filter(r => r.daily_orders_delta != null).length;
    const weeklyBought = (trackedDaysProduct >= 7 && daysWithData >= 3)
      ? (weeklyFromDaily > 0 ? weeklyFromDaily : null)
      : getScrapedWeeklyBought(snaps);
    const daily_sold = weeklyDailyRows[0]?.daily_orders_delta != null ? Number(weeklyDailyRows[0].daily_orders_delta) : null;

    return {
      product_id: product.id.toString(), title: product.title,
      rating: product.rating ? Number(product.rating) : null,
      feedback_quantity: product.feedback_quantity,
      orders_quantity: product.orders_quantity?.toString(),
      shop_name: product.shop?.title ?? null,
      score: latest?.score ? Number(latest.score) : null,
      weekly_bought: weeklyBought, daily_sold,
      sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
      stock_type: sku?.stock_type ?? null, photo_url: product.photo_url ?? null,
      total_available_amount: product.total_available_amount?.toString() ?? null,
      ai_explanation, last_updated: latest?.snapshot_at ?? product.updated_at,
      uzum_card_price: latest?.uzum_card_price ? Number(latest.uzum_card_price) : null,
      uzum_card_discount: latest?.uzum_card_discount ?? null, seller_discount: latest?.seller_discount ?? null,
      is_best_price: latest?.is_best_price ?? null, delivery_type: latest?.delivery_type ?? null,
      delivery_date: latest?.delivery_date ?? null,
    };
  }

  async getProductQuickScore(productId: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        snapshots: { orderBy: { snapshot_at: 'desc' }, take: 5, select: { score: true, weekly_bought: true, weekly_bought_source: true, orders_quantity: true, snapshot_at: true } },
        skus: { where: { is_available: true }, orderBy: { min_sell_price: 'asc' }, take: 1 },
      },
    });
    if (!product) return null;
    const latest = product.snapshots[0];
    const sku = product.skus[0];
    return {
      product_id: product.id.toString(), title: product.title,
      score: latest?.score ? Number(latest.score) : null,
      weekly_bought: getScrapedWeeklyBought(product.snapshots),
      sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
      photo_url: product.photo_url ?? null,
      last_updated: latest?.snapshot_at ?? product.updated_at,
    };
  }

  async trackFromSearch(accountId: string, uzumProductId: number): Promise<{ product_id: string; title: string; is_new: boolean }> {
    const productBigInt = BigInt(uzumProductId);
    const existing = await this.prisma.product.findUnique({ where: { id: productBigInt }, select: { id: true, title: true } });
    let title: string;
    if (existing) {
      title = existing.title;
    } else {
      const detail = await this.uzumClient.fetchProductDetail(uzumProductId);
      if (!detail) throw new NotFoundException(`Product ${uzumProductId} not found on Uzum`);
      await this.upsertShopAndProduct(detail, productBigInt);
      title = detail.title;
      this.logger.log(`Created product ${uzumProductId} from search track`);
    }
    await this.trackProduct(accountId, productBigInt);
    return { product_id: productBigInt.toString(), title, is_new: !existing };
  }

  async trackProduct(accountId: string, productId: bigint) {
    const existing = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!existing) {
      const detail = await this.uzumClient.fetchProductDetail(Number(productId));
      if (!detail) throw new NotFoundException(`Product ${productId.toString()} not found on Uzum`);
      await this.upsertShopAndProduct(detail, productId);
      this.logger.log(`Created product ${productId.toString()} from track endpoint`);
    }
    const tp = await this.prisma.trackedProduct.upsert({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      update: { is_active: true, next_scrape_at: new Date(), created_at: new Date() },
      create: { account_id: accountId, product_id: productId, next_scrape_at: new Date() },
    });
    return { ...tp, product_id: tp.product_id.toString() };
  }

  async untrackProduct(accountId: string, productId: bigint) {
    await this.prisma.trackedProduct.updateMany({ where: { account_id: accountId, product_id: productId }, data: { is_active: false } });
    return { untracked: true };
  }

  async setIsMine(accountId: string, productId: bigint, isMine: boolean) {
    const tp = await this.prisma.trackedProduct.findUnique({ where: { account_id_product_id: { account_id: accountId, product_id: productId } } });
    if (!tp) throw new Error('Mahsulot kuzatuvda emas');
    await this.prisma.trackedProduct.update({ where: { account_id_product_id: { account_id: accountId, product_id: productId } }, data: { is_mine: isMine } });
    return { is_mine: isMine };
  }
}
