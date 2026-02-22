import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UzumClient } from './uzum.client';
import {
  parseUzumProductId,
  parseWeeklyBought,
  calculateScore,
  getSupplyPressure,
  sleep,
} from '@uzum/utils';

@Injectable()
export class UzumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uzumClient: UzumClient,
  ) {}

  /**
   * URL Analyze: URL → upsert product/shop/sku → snapshot → score
   */
  async analyzeUrl(url: string): Promise<any> {
    const productId = parseUzumProductId(url);
    if (!productId) {
      throw new BadRequestException('Invalid Uzum URL. Expected: https://uzum.uz/product/12345');
    }

    return this.analyzeProduct(productId);
  }

  async analyzeProduct(productId: number): Promise<any> {
    // 1. Fetch product detail
    const detail = await this.uzumClient.fetchProductDetail(productId);
    if (!detail) {
      throw new BadRequestException(`Product ${productId} not found on Uzum`);
    }

    // 2. Upsert shop
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

    // 3. Upsert product
    await this.prisma.product.upsert({
      where: { id: BigInt(productId) },
      update: {
        title: detail.title,
        rating: detail.rating,
        feedback_quantity: detail.feedbackQuantity,
        orders_quantity: BigInt(detail.ordersQuantity ?? 0),
        shop_id: detail.shop ? BigInt(detail.shop.id) : undefined,
      },
      create: {
        id: BigInt(productId),
        title: detail.title,
        rating: detail.rating,
        feedback_quantity: detail.feedbackQuantity,
        orders_quantity: BigInt(detail.ordersQuantity ?? 0),
        shop_id: detail.shop ? BigInt(detail.shop.id) : undefined,
      },
    });

    // 4. Parse weekly_bought
    // Prefer recentOrdersAmount (rOrdersAmount from REST API) over actions text parsing
    const actionsText = detail.actions?.text ?? '';
    const weeklyBought =
      detail.recentOrdersAmount != null
        ? detail.recentOrdersAmount
        : parseWeeklyBought(actionsText);

    // 5. Upsert SKUs
    const skuList = detail.skuList ?? [];
    for (const sku of skuList) {
      const stockType = sku.availableAmount > 0 ? 'FBO' : 'FBS';

      await this.prisma.sku.upsert({
        where: { id: BigInt(sku.id) },
        update: {
          min_sell_price: BigInt(sku.sellPrice ?? 0),
          min_full_price: BigInt(sku.fullPrice ?? 0),
          stock_type: stockType,
          is_available: sku.availableAmount > 0,
        },
        create: {
          id: BigInt(sku.id),
          product_id: BigInt(productId),
          min_sell_price: BigInt(sku.sellPrice ?? 0),
          min_full_price: BigInt(sku.fullPrice ?? 0),
          stock_type: stockType,
          is_available: sku.availableAmount > 0,
        },
      });

      // SKU snapshot
      await this.prisma.skuSnapshot.create({
        data: {
          sku_id: BigInt(sku.id),
          sell_price: BigInt(sku.sellPrice ?? 0),
          full_price: BigInt(sku.fullPrice ?? 0),
          discount_percent: sku.discountPercent ?? 0,
          stock_type: stockType,
        },
      });
    }

    // 6. Calculate score
    const primarySku = skuList[0];
    const supplyPressure = getSupplyPressure(
      primarySku?.availableAmount > 0 ? 'FBO' : 'FBS',
    );

    const score = calculateScore({
      weekly_bought: weeklyBought,
      orders_quantity: detail.ordersQuantity ?? 0,
      rating: detail.rating ?? 0,
      supply_pressure: supplyPressure,
    });

    // 7. Product snapshot
    const snapshot = await this.prisma.productSnapshot.create({
      data: {
        product_id: BigInt(productId),
        orders_quantity: BigInt(detail.ordersQuantity ?? 0),
        weekly_bought: weeklyBought,
        rating: detail.rating,
        feedback_quantity: detail.feedbackQuantity,
        score: score,
      },
    });

    return {
      product_id: productId,
      title: detail.title,
      rating: detail.rating,
      feedback_quantity: detail.feedbackQuantity,
      orders_quantity: detail.ordersQuantity,
      weekly_bought: weeklyBought,
      score: Number(score.toFixed(4)),
      snapshot_id: snapshot.id,
      sell_price: primarySku?.sellPrice,
    };
  }
}
