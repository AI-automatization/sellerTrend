import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateScore, getSupplyPressure, sleep } from '@uzum/utils';

const REST_BASE = 'https://api.uzum.uz/api/v2';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  Accept: 'application/json',
};

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Start a new discovery run — processes in background */
  async startRun(accountId: string, categoryId: number): Promise<string> {
    const run = await this.prisma.categoryRun.create({
      data: {
        account_id: accountId,
        category_id: BigInt(categoryId),
        status: 'PENDING',
      },
    });

    // Fire-and-forget background processing
    this.processRun(run.id, categoryId).catch((err) =>
      this.logger.error(`Run ${run.id} failed: ${err.message}`),
    );

    return run.id;
  }

  /** List runs for an account */
  async listRuns(accountId: string) {
    const runs = await this.prisma.categoryRun.findMany({
      where: { account_id: accountId },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: { _count: { select: { winners: true } } },
    });

    return runs.map((r) => ({
      id: r.id,
      category_id: r.category_id.toString(),
      status: r.status,
      total_products: r.total_products,
      processed: r.processed,
      winner_count: r._count.winners,
      started_at: r.started_at,
      finished_at: r.finished_at,
      created_at: r.created_at,
    }));
  }

  /** Get run details with winners */
  async getRun(runId: string, accountId: string) {
    const run = await this.prisma.categoryRun.findFirst({
      where: { id: runId, account_id: accountId },
      include: {
        winners: {
          orderBy: { rank: 'asc' },
          include: { product: { select: { title: true } } },
        },
      },
    });

    if (!run) throw new NotFoundException('Run not found');

    return {
      id: run.id,
      category_id: run.category_id.toString(),
      status: run.status,
      total_products: run.total_products,
      processed: run.processed,
      started_at: run.started_at,
      finished_at: run.finished_at,
      created_at: run.created_at,
      winners: run.winners.map((w) => ({
        rank: w.rank,
        product_id: w.product_id.toString(),
        title: w.product.title,
        score: w.score ? Number(w.score) : null,
        weekly_bought: w.weekly_bought,
        orders_quantity: w.orders_quantity?.toString(),
        sell_price: w.sell_price?.toString(),
      })),
    };
  }

  /** Latest completed run winners (leaderboard) */
  async getLeaderboard(accountId: string, categoryId?: number) {
    const latestRun = await this.prisma.categoryRun.findFirst({
      where: {
        account_id: accountId,
        status: 'DONE',
        ...(categoryId && { category_id: BigInt(categoryId) }),
      },
      orderBy: { finished_at: 'desc' },
      include: {
        winners: {
          orderBy: { rank: 'asc' },
          include: { product: { select: { title: true } } },
        },
      },
    });

    if (!latestRun) return { run_id: null, category_id: null, winners: [] };

    return {
      run_id: latestRun.id,
      category_id: latestRun.category_id.toString(),
      finished_at: latestRun.finished_at,
      winners: latestRun.winners.map((w) => ({
        rank: w.rank,
        product_id: w.product_id.toString(),
        title: w.product.title,
        score: w.score ? Number(w.score) : null,
        weekly_bought: w.weekly_bought,
        orders_quantity: w.orders_quantity?.toString(),
        sell_price: w.sell_price?.toString(),
      })),
    };
  }

  /** Background processing logic */
  private async processRun(runId: string, categoryId: number) {
    this.logger.log(`[run:${runId}] Starting category ${categoryId}`);

    await this.prisma.categoryRun.update({
      where: { id: runId },
      data: { status: 'RUNNING', started_at: new Date() },
    });

    try {
      const firstPage = await this.fetchPage(categoryId, 0);
      const total = firstPage.total;
      const totalPages = Math.min(Math.ceil(total / 48), 10);

      await this.prisma.categoryRun.update({
        where: { id: runId },
        data: { total_products: total },
      });

      const allItems: any[] = [...firstPage.items];

      for (let page = 1; page < totalPages; page++) {
        await sleep(1000);
        const pageData = await this.fetchPage(categoryId, page);
        allItems.push(...pageData.items);
        await this.prisma.categoryRun.update({
          where: { id: runId },
          data: { processed: page * 48 },
        });
      }

      // Score and sort
      const scored = allItems
        .filter((item: any) => item?.id && item?.ordersAmount != null)
        .map((item: any) => {
          const stockType: 'FBO' | 'FBS' =
            item?.skuList?.[0]?.stock?.type === 'FBO' ? 'FBO' : 'FBS';
          return {
            item,
            score: calculateScore({
              weekly_bought: item.rOrdersAmount ?? null,
              orders_quantity: item.ordersAmount ?? 0,
              rating: item.rating ?? 0,
              supply_pressure: getSupplyPressure(stockType),
            }),
          };
        })
        .sort((a, b) => b.score - a.score);

      const top20 = scored.slice(0, 20);

      for (let i = 0; i < top20.length; i++) {
        const { item, score } = top20[i];
        const productId = BigInt(item.id);
        const sellPrice = item.skuList?.[0]?.purchasePrice
          ? BigInt(item.skuList[0].purchasePrice)
          : null;

        await this.prisma.product.upsert({
          where: { id: productId },
          update: {
            title: item.title ?? item.localizableTitle?.ru ?? '',
            rating: item.rating,
            orders_quantity: BigInt(item.ordersAmount ?? 0),
          },
          create: {
            id: productId,
            title: item.title ?? item.localizableTitle?.ru ?? '',
            rating: item.rating,
            orders_quantity: BigInt(item.ordersAmount ?? 0),
          },
        });

        await this.prisma.categoryWinner.create({
          data: {
            run_id: runId,
            product_id: productId,
            score,
            rank: i + 1,
            weekly_bought: item.rOrdersAmount ?? null,
            orders_quantity: BigInt(item.ordersAmount ?? 0),
            sell_price: sellPrice,
          },
        });
      }

      await this.prisma.categoryRun.update({
        where: { id: runId },
        data: { status: 'DONE', finished_at: new Date(), processed: allItems.length },
      });

      this.logger.log(
        `[run:${runId}] Done. ${allItems.length} products, ${top20.length} winners`,
      );
    } catch (err: any) {
      this.logger.error(`[run:${runId}] Error: ${err.message}`);
      await this.prisma.categoryRun.update({
        where: { id: runId },
        data: { status: 'FAILED', finished_at: new Date() },
      });
      throw err;
    }
  }

  private async fetchPage(
    categoryId: number,
    page: number,
  ): Promise<{ items: any[]; total: number }> {
    const url = `${REST_BASE}/category/${categoryId}/products?size=48&page=${page}&sort=ORDER_COUNT_DESC`;
    const res = await fetch(url, { headers: HEADERS });

    if (res.status === 429) {
      await sleep(5000);
      return this.fetchPage(categoryId, page);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as any;
    const payload = data?.payload ?? data;
    const items: any[] = payload?.data?.products ?? payload?.products ?? [];
    const total: number = payload?.data?.total ?? payload?.total ?? 0;

    return { items, total };
  }
}
