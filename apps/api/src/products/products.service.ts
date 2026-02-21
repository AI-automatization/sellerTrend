import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrackedProducts(accountId: string) {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
          include: {
            snapshots: {
              orderBy: { snapshot_at: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return tracked.map((t) => {
      const latest = t.product.snapshots[0];
      return {
        product_id: t.product.id.toString(),
        title: t.product.title,
        rating: t.product.rating,
        orders_quantity: t.product.orders_quantity?.toString(),
        score: latest?.score ? Number(latest.score) : null,
        weekly_bought: latest?.weekly_bought,
        tracked_since: t.created_at,
      };
    });
  }

  async trackProduct(accountId: string, productId: bigint) {
    return this.prisma.trackedProduct.upsert({
      where: {
        account_id_product_id: {
          account_id: accountId,
          product_id: productId,
        },
      },
      update: { is_active: true },
      create: {
        account_id: accountId,
        product_id: productId,
      },
    });
  }

  async getProductSnapshots(productId: bigint, limit = 30) {
    return this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'desc' },
      take: limit,
      select: {
        score: true,
        weekly_bought: true,
        orders_quantity: true,
        rating: true,
        snapshot_at: true,
      },
    });
  }
}
