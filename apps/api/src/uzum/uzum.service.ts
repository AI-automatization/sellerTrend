import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UzumClient } from './uzum.client';
import { AiService } from '../ai/ai.service';
import {
  parseUzumProductId,
  calculateScore,
  getSupplyPressure,
  sleep,
} from '@uzum/utils';

@Injectable()
export class UzumService {
  private readonly logger = new Logger(UzumService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uzumClient: UzumClient,
    private readonly aiService: AiService,
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

    // 4. Calculate weekly_bought from ordersAmount delta (snapshot tarixidan)
    // ESLATMA: rOrdersAmount = rounded total orders (haftalik EMAS!)
    // actions.text = Uzum API dan olib tashlangan (undefined)
    // Yechim: oxirgi snapshot'dagi ordersAmount bilan hozirgi ordersAmount farqi
    const currentOrders = detail.ordersQuantity ?? 0;
    let weeklyBought: number | null = null;

    const prevSnapshot = await this.prisma.productSnapshot.findFirst({
      where: { product_id: BigInt(productId) },
      orderBy: { snapshot_at: 'desc' },
      select: { orders_quantity: true, snapshot_at: true },
    });

    if (prevSnapshot && prevSnapshot.orders_quantity != null) {
      const daysDiff =
        (Date.now() - prevSnapshot.snapshot_at.getTime()) / (1000 * 60 * 60 * 24);
      const ordersDiff = currentOrders - Number(prevSnapshot.orders_quantity);

      if (daysDiff > 0 && ordersDiff >= 0) {
        // Normalize to 7-day period
        weeklyBought = Math.round((ordersDiff * 7) / daysDiff);
      }
      this.logger.log(
        `weekly_bought delta: current=${currentOrders}, prev=${prevSnapshot.orders_quantity}, ` +
        `daysDiff=${daysDiff.toFixed(1)}, ordersDiff=${ordersDiff}, weeklyBought=${weeklyBought}`,
      );
    } else {
      this.logger.log(
        `weekly_bought: no previous snapshot for product ${productId}, first analysis`,
      );
    }

    // 5. Upsert SKUs
    const skuList = detail.skuList ?? [];
    for (const sku of skuList) {
      const stockType = (sku.stockType as 'FBO' | 'FBS') ?? 'FBS';

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
      (primarySku?.stockType as 'FBO' | 'FBS') ?? 'FBS',
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

    // 8. Anomaly detection: score spike check (fire-and-forget)
    const scoreNum = Number(score.toFixed(4));
    this.checkScoreAnomaly(BigInt(productId), scoreNum).catch(() => {});

    // 9. AI — attribute extraction (fire-and-forget, cached)
    const primaryDiscount = primarySku?.discountPercent ?? 0;

    this.aiService
      .extractAttributes(BigInt(productId), detail.title)
      .catch(() => {});

    // 10. AI — winner explanation if score is notable (score > 3)
    let aiExplanation: string[] | null = null;
    if (scoreNum > 3) {
      aiExplanation = await this.aiService
        .explainWinner({
          productId: BigInt(productId),
          snapshotId: snapshot.id,
          title: detail.title,
          score: scoreNum,
          weeklyBought: weeklyBought,
          ordersQuantity: detail.ordersQuantity ?? 0,
          discountPercent: primaryDiscount,
          rating: detail.rating ?? 0,
        })
        .catch(() => null);
    }

    return {
      product_id: productId,
      title: detail.title,
      rating: detail.rating,
      feedback_quantity: detail.feedbackQuantity,
      orders_quantity: detail.ordersQuantity,
      weekly_bought: weeklyBought,
      score: scoreNum,
      snapshot_id: snapshot.id,
      sell_price: primarySku?.sellPrice,
      total_available_amount: detail.totalAvailableAmount ?? 0,
      ai_explanation: aiExplanation,
    };
  }

  /**
   * Detect score spike and fire SCORE_SPIKE alert events.
   * Runs asynchronously — errors are silently ignored.
   */
  private async checkScoreAnomaly(productId: bigint, currentScore: number) {
    // Get last 7 historical snapshots (skip the most recent just saved)
    const history = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'desc' },
      skip: 1,
      take: 7,
      select: { score: true },
    });

    if (history.length < 3) return;

    const scores = history.map((s) => Number(s.score ?? 0));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    const isSpike = currentScore > avg + 2 * stdDev && currentScore - avg > 1.0;
    if (!isSpike) return;

    // Fire alert events for any active SCORE_SPIKE rules on this product
    const rules = await this.prisma.alertRule.findMany({
      where: { product_id: productId, rule_type: 'SCORE_SPIKE', is_active: true },
      select: { id: true },
    });

    if (rules.length === 0) return;

    await this.prisma.alertEvent.createMany({
      data: rules.map((r) => ({
        rule_id: r.id,
        product_id: productId,
        message: `Score spike detected: ${currentScore.toFixed(2)} (avg ${avg.toFixed(2)})`,
      })),
    });
  }
}
