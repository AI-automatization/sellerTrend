import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateTrustScore } from '@uzum/utils';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async getShopProfile(shopId: bigint) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        products: {
          where: { is_active: true },
          include: {
            snapshots: { orderBy: { snapshot_at: 'desc' }, take: 1 },
            skus: {
              where: { is_available: true },
              orderBy: { min_sell_price: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!shop) throw new NotFoundException('Shop not found');

    const totalProducts = shop.products.length;
    const fboCount = shop.products.filter(
      (p) => p.skus[0]?.stock_type === 'FBO',
    ).length;

    const ageMs = shop.registered_at
      ? Date.now() - shop.registered_at.getTime()
      : 0;
    const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30);

    const totalFeedback = shop.products.reduce(
      (sum, p) => sum + (p.feedback_quantity ?? 0),
      0,
    );

    const trustScore = calculateTrustScore({
      orders_quantity: Number(shop.orders_quantity ?? 0),
      rating: Number(shop.rating ?? 0),
      feedback_quantity: totalFeedback,
      fbo_ratio: totalProducts > 0 ? fboCount / totalProducts : 0,
      age_months: ageMonths,
    });

    // Top-5 products by score
    const scored = shop.products
      .map((p) => ({
        product_id: p.id.toString(),
        title: p.title,
        score: p.snapshots[0]?.score ? Number(p.snapshots[0].score) : 0,
        weekly_bought: p.snapshots[0]?.weekly_bought ?? 0,
        sell_price: p.skus[0]?.min_sell_price
          ? Number(p.skus[0].min_sell_price)
          : null,
      }))
      .sort((a, b) => b.score - a.score);

    // Growth 30d: compare orders now vs 30 days ago
    const growth30d = await this.calculateGrowth(shopId);

    return {
      shop_id: shop.id.toString(),
      title: shop.title,
      rating: shop.rating ? Number(shop.rating) : null,
      orders_quantity: shop.orders_quantity?.toString() ?? '0',
      total_products: totalProducts,
      trust_score: Number(trustScore.toFixed(4)),
      growth_30d: growth30d,
      top_products: scored.slice(0, 5),
      registered_at: shop.registered_at,
    };
  }

  async getShopProducts(shopId: bigint) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const products = await this.prisma.product.findMany({
      where: { shop_id: shopId, is_active: true },
      include: {
        snapshots: { orderBy: { snapshot_at: 'desc' }, take: 1 },
        skus: {
          where: { is_available: true },
          orderBy: { min_sell_price: 'asc' },
          take: 1,
        },
      },
      orderBy: { orders_quantity: 'desc' },
    });

    return products.map((p) => ({
      product_id: p.id.toString(),
      title: p.title,
      rating: p.rating ? Number(p.rating) : null,
      feedback_quantity: p.feedback_quantity,
      orders_quantity: p.orders_quantity?.toString(),
      score: p.snapshots[0]?.score ? Number(p.snapshots[0].score) : null,
      weekly_bought: p.snapshots[0]?.weekly_bought ?? null,
      sell_price: p.skus[0]?.min_sell_price
        ? Number(p.skus[0].min_sell_price)
        : null,
    }));
  }

  private async calculateGrowth(shopId: bigint): Promise<number | null> {
    const now = new Date();
    const ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const products = await this.prisma.product.findMany({
      where: { shop_id: shopId },
      select: { id: true },
    });
    if (products.length === 0) return null;

    const productIds = products.map((p) => p.id);

    const [latestSnaps, oldSnaps] = await Promise.all([
      this.prisma.productSnapshot.findMany({
        where: { product_id: { in: productIds } },
        orderBy: { snapshot_at: 'desc' },
        distinct: ['product_id'],
        select: { weekly_bought: true },
      }),
      this.prisma.productSnapshot.findMany({
        where: {
          product_id: { in: productIds },
          snapshot_at: { lte: ago },
        },
        orderBy: { snapshot_at: 'desc' },
        distinct: ['product_id'],
        select: { weekly_bought: true },
      }),
    ]);

    const currentTotal = latestSnaps.reduce(
      (s, r) => s + (r.weekly_bought ?? 0),
      0,
    );
    const oldTotal = oldSnaps.reduce(
      (s, r) => s + (r.weekly_bought ?? 0),
      0,
    );

    if (oldTotal === 0) return currentTotal > 0 ? 100 : 0;
    return Number((((currentTotal - oldTotal) / oldTotal) * 100).toFixed(2));
  }
}
