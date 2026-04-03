import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UzumClient } from '../uzum/uzum.client';
import { calculateTrustScore } from '@uzum/utils';

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uzumClient: UzumClient,
  ) {}

  async searchByName(query: string) {
    const MAX_SHOP_SEARCH_RESULTS = 10;
    const dbShops = await this.prisma.shop.findMany({
      where: { title: { contains: query, mode: 'insensitive' } },
      select: { id: true, title: true, orders_quantity: true },
      orderBy: { orders_quantity: 'desc' },
      take: MAX_SHOP_SEARCH_RESULTS,
    });

    if (dbShops.length >= 3) {
      return dbShops.map((s) => ({ id: s.id.toString(), title: s.title }));
    }

    // Fallback: Uzum API dan qidirish
    const uzumSellers = await this.uzumClient.searchSellers(query, MAX_SHOP_SEARCH_RESULTS);
    if (uzumSellers.length === 0) {
      return dbShops.map((s) => ({ id: s.id.toString(), title: s.title }));
    }

    // Yangi topilgan do'konlarni DB ga upsert qilish (keyingi qidiruvlarda local DB topsin)
    await Promise.allSettled(
      uzumSellers.map((s) =>
        this.prisma.shop.upsert({
          where: { id: BigInt(s.id) },
          update: { title: s.title, orders_quantity: BigInt(s.ordersQuantity) },
          create: { id: BigInt(s.id), title: s.title, orders_quantity: BigInt(s.ordersQuantity) },
        }),
      ),
    );

    // DB va Uzum natijalarini birlashtirish (takrorlanmasdan)
    const dbIds = new Set(dbShops.map((s) => s.id.toString()));
    const merged = [
      ...dbShops.map((s) => ({ id: s.id.toString(), title: s.title })),
      ...uzumSellers
        .filter((s) => !dbIds.has(s.id.toString()))
        .map((s) => ({ id: s.id.toString(), title: s.title })),
    ];

    return merged.slice(0, MAX_SHOP_SEARCH_RESULTS);
  }

  async getShopProfile(shopId: bigint) {
    const MAX_SHOP_PROFILE_PRODUCTS = 100;
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        products: {
          where: { is_active: true },
          orderBy: { orders_quantity: 'desc' },
          take: MAX_SHOP_PROFILE_PRODUCTS,
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

  async getShopProducts(shopId: bigint, page = 1, limit = 100) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const MAX_SHOP_PRODUCTS = 100;
    const take = Math.min(limit, MAX_SHOP_PRODUCTS);
    const skip = (page - 1) * take;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
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
        take,
        skip,
      }),
      this.prisma.product.count({
        where: { shop_id: shopId, is_active: true },
      }),
    ]);

    return {
      data: products.map((p) => ({
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
      })),
      total,
      page,
      limit: take,
      pages: Math.ceil(total / take),
    };
  }

  private async calculateGrowth(shopId: bigint): Promise<number | null> {
    const now = new Date();
    const ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const MAX_GROWTH_PRODUCTS = 500;
    const products = await this.prisma.product.findMany({
      where: { shop_id: shopId },
      select: { id: true },
      take: MAX_GROWTH_PRODUCTS,
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
