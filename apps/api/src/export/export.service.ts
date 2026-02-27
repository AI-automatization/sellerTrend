import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export tracked products as CSV string.
   */
  async exportTrackedCsv(accountId: string): Promise<string> {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
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

    const rows = tracked.map((t) => {
      const snap = t.product.snapshots[0];
      const sku = t.product.skus[0];
      return {
        product_id: t.product.id.toString(),
        title: t.product.title,
        rating: t.product.rating ? Number(t.product.rating) : '',
        feedback: t.product.feedback_quantity ?? '',
        orders: t.product.orders_quantity?.toString() ?? '',
        score: snap?.score ? Number(snap.score) : '',
        weekly_bought: snap?.weekly_bought ?? '',
        sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : '',
        tracked_since: t.created_at.toISOString().split('T')[0],
      };
    });

    if (rows.length === 0) return 'product_id,title,rating,feedback,orders,score,weekly_bought,sell_price,tracked_since\n';

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = String((r as Record<string, unknown>)[h]);
            return val.includes(',') ? `"${val}"` : val;
          })
          .join(','),
      ),
    ];
    return csvLines.join('\n');
  }

  /**
   * Export discovery run winners as XLSX buffer.
   */
  async exportDiscoveryXlsx(
    accountId: string,
    runId: string,
  ): Promise<Buffer> {
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

    const rows = run.winners.map((w) => ({
      rank: w.rank,
      product_id: w.product_id.toString(),
      title: w.product.title,
      score: w.score ? Number(w.score) : null,
      weekly_bought: w.weekly_bought,
      orders: w.orders_quantity?.toString() ?? '',
      sell_price: w.sell_price?.toString() ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Winners');

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  /**
   * Parse CSV upload: extract Uzum product URLs, return array.
   */
  parseCsvUrls(csvContent: string): string[] {
    const lines = csvContent.split('\n').filter((l) => l.trim());
    const urls: string[] = [];

    for (const line of lines) {
      // Find anything that looks like a Uzum URL
      const match = line.match(/(https?:\/\/uzum\.uz\/[^\s,;"']+)/);
      if (match) urls.push(match[1]);
    }

    return urls.slice(0, 100); // max 100
  }
}
