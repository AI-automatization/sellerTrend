import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  detectCannibalization,
  predictDeadStock,
  calculateSaturation,
  detectFlashSales,
  detectEarlySignals,
  detectStockCliff,
  planReplenishment,
  recalcWeeklyBoughtSeries,
} from '@uzum/utils';

@Injectable()
export class SignalsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Feature 21 — Cannibalization Alert */
  async getCannibalization(accountId: string) {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
          include: {
            snapshots: { orderBy: { snapshot_at: 'desc' }, take: 2 },
          },
        },
      },
    });

    const products = tracked.map((t) => {
      const snaps = [...t.product.snapshots].reverse(); // ASC order
      const weeklyValues = recalcWeeklyBoughtSeries(snaps);
      const latest = snaps[snaps.length - 1];
      return {
        id: t.product.id.toString(),
        title: t.product.title,
        category_id: t.product.category_id ? Number(t.product.category_id) : null,
        score: latest?.score ? Number(latest.score) : 0,
        weekly_bought: weeklyValues[weeklyValues.length - 1] ?? 0,
        shop_id: t.product.shop_id?.toString() ?? null,
      };
    });

    return detectCannibalization(products);
  }

  /** Feature 22 — Dead Stock Predictor */
  async getDeadStockRisk(accountId: string) {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
          include: {
            snapshots: { orderBy: { snapshot_at: 'asc' }, take: 30 },
          },
        },
      },
    });

    return tracked
      .map((t) => {
        const weeklyValues = recalcWeeklyBoughtSeries(t.product.snapshots);
        const snaps = t.product.snapshots.map((s, i) => ({
          score: Number(s.score ?? 0),
          weekly_bought: weeklyValues[i],
          date: s.snapshot_at.toISOString(),
        }));
        return predictDeadStock(snaps, t.product.id.toString(), t.product.title);
      })
      .filter((r) => r.risk_level !== 'low')
      .sort((a, b) => b.risk_score - a.risk_score);
  }

  /** Feature 23 — Category Saturation Index */
  async getSaturation(categoryId: number) {
    const products = await this.prisma.product.findMany({
      where: { category_id: BigInt(categoryId), is_active: true },
      include: {
        snapshots: { orderBy: { snapshot_at: 'desc' }, take: 2 },
      },
    });

    const data = products.map((p) => {
      const snaps = [...p.snapshots].reverse(); // ASC
      const weeklyValues = recalcWeeklyBoughtSeries(snaps);
      const latest = snaps[snaps.length - 1];
      return {
        score: latest?.score ? Number(latest.score) : 0,
        weekly_bought: weeklyValues[weeklyValues.length - 1] ?? 0,
        shop_id: p.shop_id?.toString() ?? null,
      };
    });

    return calculateSaturation(data, categoryId);
  }

  /** Feature 24 — Flash Sale Detector */
  async getFlashSales(accountId: string) {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
          include: {
            skus: {
              include: {
                sku_snapshots: {
                  orderBy: { snapshot_at: 'desc' },
                  take: 5,
                },
              },
            },
          },
        },
      },
    });

    const priceHistory = tracked
      .filter((t) => t.product.skus.length > 0)
      .map((t) => {
        const sku = t.product.skus[0];
        return {
          product_id: t.product.id.toString(),
          title: t.product.title,
          prices: sku.sku_snapshots.map((s) => ({
            price: Number(s.sell_price ?? 0),
            date: s.snapshot_at.toISOString(),
          })),
        };
      });

    return detectFlashSales(priceHistory);
  }

  /** Feature 25 — New Product Early Signal */
  async getEarlySignals(accountId: string) {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
          include: {
            snapshots: { orderBy: { snapshot_at: 'asc' }, take: 30 },
          },
        },
      },
    });

    const products = tracked.map((t) => {
      const weeklyValues = recalcWeeklyBoughtSeries(t.product.snapshots);
      return {
        product_id: t.product.id.toString(),
        title: t.product.title,
        created_at: t.product.created_at.toISOString(),
        snapshots: t.product.snapshots.map((s, i) => ({
          score: Number(s.score ?? 0),
          weekly_bought: weeklyValues[i],
          date: s.snapshot_at.toISOString(),
        })),
      };
    });

    return detectEarlySignals(products);
  }

  /** Feature 26 — Stock Cliff Alert */
  async getStockCliffs(accountId: string) {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
          include: {
            snapshots: { orderBy: { snapshot_at: 'desc' }, take: 14 },
          },
        },
      },
    });

    const products = tracked.map((t) => {
      const snaps = [...t.product.snapshots].reverse(); // ASC order
      const weeklyValues = recalcWeeklyBoughtSeries(snaps);
      return {
        product_id: t.product.id.toString(),
        title: t.product.title,
        weekly_bought: weeklyValues[weeklyValues.length - 1] ?? 0,
        orders_quantity: Number(t.product.orders_quantity ?? 0),
        // total_available_amount not in schema yet — rely on orders_quantity heuristic
        snapshots: snaps.map((s, i) => ({
          weekly_bought: weeklyValues[i],
          date: s.snapshot_at.toISOString(),
        })),
      };
    });

    return detectStockCliff(products);
  }

  /** Feature 27 — Ranking Position Tracker */
  async getRankingHistory(productId: bigint) {
    const winners = await this.prisma.categoryWinner.findMany({
      where: { product_id: productId },
      orderBy: { created_at: 'asc' },
      take: 60,
      include: { run: { select: { category_id: true, created_at: true } } },
    });

    return winners.map((w) => ({
      date: w.created_at.toISOString(),
      rank: w.rank,
      score: w.score ? Number(w.score) : null,
      weekly_bought: w.weekly_bought,
      category_id: w.run.category_id.toString(),
    }));
  }

  /** Feature 28 — Product Launch Checklist */
  async getChecklist(accountId: string, productId?: string) {
    const existing = await this.prisma.productChecklist.findFirst({
      where: {
        account_id: accountId,
        product_id: productId ? BigInt(productId) : null,
      },
      orderBy: { updated_at: 'desc' },
    });

    if (existing) {
      return { id: existing.id, title: existing.title, items: existing.items };
    }

    // Return default checklist template
    return {
      id: null,
      title: 'Yangi mahsulot chiqarish',
      items: [
        { key: 'research', label: 'Bozor tadqiqoti va raqobat tahlili', done: false },
        { key: 'niche', label: 'Niche topish (Niche Finder ishlatish)', done: false },
        { key: 'sourcing', label: "Yetkazib beruvchi topish (Sourcing bo'limi)", done: false },
        { key: 'profit', label: "Foyda kalkulyatsiyasi (Profit Calculator)", done: false },
        { key: 'photos', label: "Professional fotosurat tayyorlash (min 5 ta)", done: false },
        { key: 'title', label: "SEO-optimallashtirilgan sarlavha (AI Description)", done: false },
        { key: 'description', label: "Batafsil mahsulot tavsifi yozish", done: false },
        { key: 'pricing', label: "Raqobatbardosh narx belgilash", done: false },
        { key: 'stock', label: "Boshlang'ich zaxira miqdorini hisoblash", done: false },
        { key: 'fbo', label: "FBO omboriga yuborish", done: false },
        { key: 'listing', label: "Uzum'ga listing joylash", done: false },
        { key: 'tracking', label: "Tracking yoqish (Dashboard'da kuzatish)", done: false },
        { key: 'ads', label: "Reklama strategiyasi belgilash", done: false },
        { key: 'review', label: "Birinchi hafta monitoring va tuzatishlar", done: false },
      ],
    };
  }

  async saveChecklist(accountId: string, data: { product_id?: string; title?: string; items?: any[] }) {
    const title = data.title || 'Yangi mahsulot chiqarish';
    const items = data.items ?? [];
    const productId = data.product_id ? BigInt(data.product_id) : null;

    const existing = await this.prisma.productChecklist.findFirst({
      where: { account_id: accountId, product_id: productId },
    });

    if (existing) {
      const c = await this.prisma.productChecklist.update({
        where: { id: existing.id },
        data: { title, items: items as any },
      });
      return { ...c, product_id: c.product_id?.toString() ?? null };
    }

    const c = await this.prisma.productChecklist.create({
      data: {
        account_id: accountId,
        product_id: productId,
        title,
        items: items as any,
      },
    });
    return { ...c, product_id: c.product_id?.toString() ?? null };
  }

  /** Feature 29 — A/B Price Testing */
  async createPriceTest(accountId: string, data: {
    product_id: string;
    original_price: number;
    test_price: number;
  }) {
    const t = await this.prisma.priceTest.create({
      data: {
        account_id: accountId,
        product_id: BigInt(data.product_id),
        original_price: BigInt(data.original_price),
        test_price: BigInt(data.test_price),
      },
    });
    return {
      ...t,
      product_id: t.product_id.toString(),
      original_price: Number(t.original_price),
      test_price: Number(t.test_price),
      original_revenue: Number(t.original_revenue),
      test_revenue: Number(t.test_revenue),
    };
  }

  async listPriceTests(accountId: string) {
    const tests = await this.prisma.priceTest.findMany({
      where: { account_id: accountId },
      orderBy: { created_at: 'desc' },
      include: { product: { select: { title: true } } },
    });

    return tests.map((t) => ({
      id: t.id,
      product_id: t.product_id.toString(),
      product_title: t.product.title,
      original_price: Number(t.original_price),
      test_price: Number(t.test_price),
      status: t.status,
      start_date: t.start_date,
      end_date: t.end_date,
      original_sales: t.original_sales,
      test_sales: t.test_sales,
      original_revenue: Number(t.original_revenue),
      test_revenue: Number(t.test_revenue),
      conclusion: t.conclusion,
      created_at: t.created_at,
    }));
  }

  async updatePriceTest(accountId: string, testId: string, data: {
    status?: string;
    original_sales?: number;
    test_sales?: number;
    conclusion?: string;
  }) {
    const test = await this.prisma.priceTest.findFirst({
      where: { id: testId, account_id: accountId },
    });
    if (!test) return null;

    const updateData: any = {};
    if (data.status === 'RUNNING') {
      updateData.status = 'RUNNING';
      updateData.start_date = new Date();
    } else if (data.status === 'COMPLETED') {
      updateData.status = 'COMPLETED';
      updateData.end_date = new Date();
    } else if (data.status === 'CANCELLED') {
      updateData.status = 'CANCELLED';
    }
    if (data.original_sales !== undefined) {
      updateData.original_sales = data.original_sales;
      updateData.original_revenue = BigInt(data.original_sales * Number(test.original_price));
    }
    if (data.test_sales !== undefined) {
      updateData.test_sales = data.test_sales;
      updateData.test_revenue = BigInt(data.test_sales * Number(test.test_price));
    }
    if (data.conclusion) updateData.conclusion = data.conclusion;

    const t = await this.prisma.priceTest.update({
      where: { id: testId },
      data: updateData,
    });
    return {
      ...t,
      product_id: t.product_id.toString(),
      original_price: Number(t.original_price),
      test_price: Number(t.test_price),
      original_revenue: Number(t.original_revenue),
      test_revenue: Number(t.test_revenue),
    };
  }

  /** Feature 30 — Replenishment Planner */
  async getReplenishmentPlan(accountId: string, leadTimeDays = 14) {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
          include: {
            snapshots: { orderBy: { snapshot_at: 'desc' }, take: 2 },
          },
        },
      },
    });

    const products = tracked.map((t) => {
      const snaps = [...t.product.snapshots].reverse(); // ASC
      const weeklyValues = recalcWeeklyBoughtSeries(snaps);
      return {
        product_id: t.product.id.toString(),
        title: t.product.title,
        weekly_bought: weeklyValues[weeklyValues.length - 1] ?? 0,
      };
    });

    return planReplenishment(products, leadTimeDays);
  }
}
