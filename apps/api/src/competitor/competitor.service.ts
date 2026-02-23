import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UzumClient } from '../uzum/uzum.client';

@Injectable()
export class CompetitorService {
  private readonly logger = new Logger(CompetitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uzumClient: UzumClient,
  ) {}

  /**
   * Discover competitor products in the same category from Uzum.
   * Returns top-10 competitors with price comparison.
   */
  async discoverCompetitorPrices(productId: bigint, accountId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { skus: { take: 1, orderBy: { min_sell_price: 'asc' } } },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    if (!product.category_id) {
      throw new NotFoundException(`Product ${productId} has no category`);
    }

    const categoryProducts = await this.uzumClient.fetchCategoryProducts(
      Number(product.category_id),
    );

    // Filter out our own product, take top-10
    const ourPrice = product.skus[0]?.min_sell_price
      ? Number(product.skus[0].min_sell_price)
      : null;

    const competitors = categoryProducts
      .filter((p: any) => Number(p.productId ?? p.id) !== Number(productId))
      .slice(0, 10)
      .map((p: any) => {
        const id = p.productId ?? p.id;
        const sellPrice = p.minSellPrice ?? p.sellPrice ?? null;
        const title = p.title ?? '';
        const rating = p.rating ?? 0;
        const orders = p.ordersQuantity ?? p.ordersAmount ?? 0;

        let is_cheaper = false;
        let price_diff_pct = 0;
        if (ourPrice && sellPrice) {
          is_cheaper = sellPrice < ourPrice;
          price_diff_pct = Math.round(
            ((sellPrice - ourPrice) / ourPrice) * 100,
          );
        }

        return {
          product_id: String(id),
          title,
          sell_price: sellPrice ? String(sellPrice) : null,
          rating,
          orders_quantity: String(orders),
          is_cheaper,
          price_diff_pct,
        };
      });

    return {
      our_product: {
        product_id: productId.toString(),
        title: product.title,
        sell_price: ourPrice ? String(ourPrice) : null,
        category_id: product.category_id.toString(),
      },
      competitors,
    };
  }

  /**
   * Start tracking competitors. Upserts tracking records and takes first snapshot.
   */
  async trackCompetitors(
    accountId: string,
    productId: string,
    competitorProductIds: string[],
  ) {
    const trackings = [];

    for (const compId of competitorProductIds) {
      // Upsert tracking
      const tracking = await this.prisma.competitorTracking.upsert({
        where: {
          account_id_product_id_competitor_product_id: {
            account_id: accountId,
            product_id: BigInt(productId),
            competitor_product_id: BigInt(compId),
          },
        },
        update: { is_active: true },
        create: {
          account_id: accountId,
          product_id: BigInt(productId),
          competitor_product_id: BigInt(compId),
          is_active: true,
        },
      });

      // Take first snapshot
      const detail = await this.uzumClient.fetchProductDetail(Number(compId));
      if (detail) {
        const sku = detail.skuList?.[0];
        await this.prisma.competitorPriceSnapshot.create({
          data: {
            tracking_id: tracking.id,
            sell_price: sku?.sellPrice ? BigInt(sku.sellPrice) : null,
            full_price: sku?.fullPrice ? BigInt(sku.fullPrice) : null,
            discount_pct: sku?.discountPercent ?? 0,
          },
        });
      }

      trackings.push({
        id: tracking.id,
        competitor_product_id: compId,
      });
    }

    return { tracked_count: trackings.length, trackings };
  }

  /**
   * Get all tracked competitors for a product with latest price trends.
   */
  async getTrackedCompetitors(productId: bigint, accountId: string) {
    const trackings = await this.prisma.competitorTracking.findMany({
      where: {
        account_id: accountId,
        product_id: productId,
        is_active: true,
      },
      include: {
        competitor: true,
        snapshots: {
          orderBy: { snapshot_at: 'desc' },
          take: 2,
        },
      },
    });

    return {
      competitors: trackings.map((t) => {
        const latest = t.snapshots[0] ?? null;
        const prev = t.snapshots[1] ?? null;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (latest?.sell_price && prev?.sell_price) {
          if (latest.sell_price > prev.sell_price) trend = 'up';
          else if (latest.sell_price < prev.sell_price) trend = 'down';
        }

        return {
          tracking_id: t.id,
          competitor_product_id: t.competitor_product_id.toString(),
          competitor_title: t.competitor.title,
          is_active: t.is_active,
          latest_price: latest?.sell_price?.toString() ?? null,
          latest_full_price: latest?.full_price?.toString() ?? null,
          latest_discount_pct: latest?.discount_pct ?? 0,
          prev_price: prev?.sell_price?.toString() ?? null,
          trend,
          last_snapshot_at: latest?.snapshot_at ?? null,
        };
      }),
    };
  }

  /**
   * Get price history for a specific competitor (for chart display).
   */
  async getCompetitorPriceHistory(
    productId: bigint,
    competitorId: bigint,
    accountId: string,
    limit = 50,
  ) {
    const tracking = await this.prisma.competitorTracking.findFirst({
      where: {
        account_id: accountId,
        product_id: productId,
        competitor_product_id: competitorId,
      },
    });

    if (!tracking) {
      throw new NotFoundException('Tracking not found');
    }

    const snapshots = await this.prisma.competitorPriceSnapshot.findMany({
      where: { tracking_id: tracking.id },
      orderBy: { snapshot_at: 'desc' },
      take: limit,
    });

    return {
      tracking_id: tracking.id,
      snapshots: snapshots.map((s) => ({
        id: s.id,
        sell_price: s.sell_price?.toString() ?? null,
        full_price: s.full_price?.toString() ?? null,
        discount_pct: s.discount_pct,
        snapshot_at: s.snapshot_at,
      })),
    };
  }

  /**
   * Stop tracking a competitor (soft delete).
   */
  async untrackCompetitor(
    productId: bigint,
    competitorId: bigint,
    accountId: string,
  ) {
    const tracking = await this.prisma.competitorTracking.findFirst({
      where: {
        account_id: accountId,
        product_id: productId,
        competitor_product_id: competitorId,
      },
    });

    if (!tracking) {
      throw new NotFoundException('Tracking not found');
    }

    await this.prisma.competitorTracking.update({
      where: { id: tracking.id },
      data: { is_active: false },
    });

    return { message: 'Competitor untracked' };
  }
}
