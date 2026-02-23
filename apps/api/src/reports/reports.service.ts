import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Create a custom report configuration */
  async createReport(
    accountId: string,
    data: {
      title: string;
      description?: string;
      report_type: string;
      filters?: any;
      columns?: any;
      schedule?: string;
    },
  ) {
    const report = await this.prisma.customReport.create({
      data: {
        account_id: accountId,
        title: data.title,
        description: data.description ?? null,
        report_type: data.report_type,
        filters: data.filters ?? {},
        columns: data.columns ?? [],
        schedule: data.schedule ?? null,
      },
    });

    return {
      id: report.id,
      title: report.title,
      description: report.description,
      report_type: report.report_type,
      filters: report.filters,
      columns: report.columns,
      schedule: report.schedule,
      created_at: report.created_at,
    };
  }

  /** List all reports for an account */
  async listReports(accountId: string) {
    const reports = await this.prisma.customReport.findMany({
      where: { account_id: accountId },
      orderBy: { created_at: 'desc' },
    });

    return reports.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      report_type: r.report_type,
      schedule: r.schedule,
      last_run_at: r.last_run_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  /** Delete a custom report */
  async deleteReport(accountId: string, reportId: string) {
    const report = await this.prisma.customReport.findFirst({
      where: { id: reportId, account_id: accountId },
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    await this.prisma.customReport.delete({
      where: { id: reportId },
    });

    return { message: 'Report deleted' };
  }

  /** Generate report data based on report_type */
  async generateReport(accountId: string, reportId: string) {
    const report = await this.prisma.customReport.findFirst({
      where: { id: reportId, account_id: accountId },
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    let rows: any[] = [];

    switch (report.report_type) {
      case 'product':
        rows = await this.generateProductReport(accountId, report.filters as any);
        break;
      case 'category':
        rows = await this.generateCategoryReport(accountId, report.filters as any);
        break;
      case 'market':
        rows = await this.generateMarketReport(report.filters as any);
        break;
      default:
        rows = [];
    }

    // Update last_run_at
    await this.prisma.customReport.update({
      where: { id: reportId },
      data: { last_run_at: new Date() },
    });

    return {
      title: report.title,
      report_type: report.report_type,
      generated_at: new Date().toISOString(),
      rows,
    };
  }

  /** Product report — tracked products with latest snapshot data */
  private async generateProductReport(accountId: string, filters: any) {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
          include: {
            snapshots: { orderBy: { snapshot_at: 'desc' }, take: 1 },
            skus: { take: 1, orderBy: { min_sell_price: 'asc' } },
          },
        },
      },
    });

    return tracked.map((t) => {
      const snap = t.product.snapshots[0];
      const sku = t.product.skus[0];
      return {
        product_id: t.product.id.toString(),
        title: t.product.title,
        category_id: t.product.category_id?.toString() ?? null,
        rating: t.product.rating ? Number(t.product.rating) : null,
        orders_quantity: t.product.orders_quantity ? Number(t.product.orders_quantity) : 0,
        weekly_bought: snap?.weekly_bought ?? 0,
        score: snap?.score ? Number(snap.score) : 0,
        sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
        snapshot_at: snap?.snapshot_at ?? null,
      };
    });
  }

  /** Category report — category winners from recent runs */
  private async generateCategoryReport(accountId: string, filters: any) {
    const runs = await this.prisma.categoryRun.findMany({
      where: { account_id: accountId, status: 'DONE' },
      orderBy: { finished_at: 'desc' },
      take: 5,
      include: {
        winners: {
          orderBy: { rank: 'asc' },
          take: 20,
          include: {
            product: { select: { title: true, shop_id: true } },
          },
        },
      },
    });

    return runs.flatMap((run) =>
      run.winners.map((w) => ({
        run_id: run.id,
        category_id: run.category_id.toString(),
        run_date: run.finished_at?.toISOString() ?? null,
        product_id: w.product_id.toString(),
        product_title: w.product.title,
        shop_id: w.product.shop_id?.toString() ?? null,
        rank: w.rank,
        score: w.score ? Number(w.score) : 0,
        weekly_bought: w.weekly_bought ?? 0,
        sell_price: w.sell_price ? Number(w.sell_price) : null,
      })),
    );
  }

  /** Market report — top products across categories */
  private async generateMarketReport(filters: any) {
    const products = await this.prisma.product.findMany({
      where: { is_active: true },
      include: {
        snapshots: { orderBy: { snapshot_at: 'desc' }, take: 1 },
        shop: { select: { title: true } },
      },
      orderBy: { orders_quantity: 'desc' },
      take: 100,
    });

    return products.map((p) => {
      const snap = p.snapshots[0];
      return {
        product_id: p.id.toString(),
        title: p.title,
        category_id: p.category_id?.toString() ?? null,
        shop_name: p.shop?.title ?? null,
        rating: p.rating ? Number(p.rating) : null,
        orders_quantity: p.orders_quantity ? Number(p.orders_quantity) : 0,
        weekly_bought: snap?.weekly_bought ?? 0,
        score: snap?.score ? Number(snap.score) : 0,
      };
    });
  }

  /** Feature 35 — Market Share Report by category */
  async generateMarketShareReport(categoryId: number) {
    const products = await this.prisma.product.findMany({
      where: { category_id: BigInt(categoryId), is_active: true },
      include: {
        snapshots: { orderBy: { snapshot_at: 'desc' }, take: 1 },
        shop: { select: { id: true, title: true } },
      },
    });

    // Aggregate by shop
    const shopMap = new Map<
      string,
      { name: string; product_count: number; total_sales: number }
    >();

    let totalSales = 0;

    for (const p of products) {
      const shopId = p.shop_id?.toString() ?? 'unknown';
      const shopName = p.shop?.title ?? 'Unknown Shop';
      const weeklyBought = p.snapshots[0]?.weekly_bought ?? 0;

      totalSales += weeklyBought;

      if (shopMap.has(shopId)) {
        const existing = shopMap.get(shopId)!;
        existing.product_count += 1;
        existing.total_sales += weeklyBought;
      } else {
        shopMap.set(shopId, {
          name: shopName,
          product_count: 1,
          total_sales: weeklyBought,
        });
      }
    }

    // Sort shops by total_sales descending
    const shops = Array.from(shopMap.entries())
      .map(([shopId, data]) => ({
        shop_id: shopId,
        name: data.name,
        product_count: data.product_count,
        total_sales: data.total_sales,
        market_share_pct:
          totalSales > 0
            ? Math.round((data.total_sales / totalSales) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.total_sales - a.total_sales);

    return {
      category_id: categoryId,
      total_products: products.length,
      total_sales: totalSales,
      shops,
    };
  }
}
