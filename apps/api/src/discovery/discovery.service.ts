import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { enqueueDiscovery } from './discovery.queue';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Create a DB record and enqueue to BullMQ worker */
  async startRun(accountId: string, categoryId: number): Promise<string> {
    const run = await this.prisma.categoryRun.create({
      data: {
        account_id: accountId,
        category_id: BigInt(categoryId),
        status: 'PENDING',
      },
    });

    await enqueueDiscovery({ categoryId, runId: run.id, accountId });
    this.logger.log(`[run:${run.id}] Enqueued category ${categoryId} → BullMQ`);

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
}
