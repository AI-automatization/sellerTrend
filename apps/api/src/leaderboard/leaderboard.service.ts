import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CachedData {
  data: unknown;
  expiry: number;
}

const MAX_CACHE_ENTRIES = 10;

@Injectable()
export class LeaderboardService {
  private cache = new Map<string, CachedData>();
  private readonly TTL = 60 * 60 * 1000; // 1 hour

  constructor(private readonly prisma: PrismaService) {}

  async getPublicLeaderboard() {
    const cached = this.getCache('public-top');
    if (cached) return cached;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const snapshots = await this.prisma.productSnapshot.findMany({
      where: { snapshot_at: { gte: since } },
      orderBy: { score: 'desc' },
      take: 100,
      distinct: ['product_id'],
      include: {
        product: {
          select: {
            title: true,
            category_id: true,
            category_path: true,
            skus: { select: { min_sell_price: true }, where: { is_available: true }, take: 1, orderBy: { min_sell_price: 'asc' } },
          },
        },
      },
    });

    const items = snapshots.map((s, i) => {
      const rank = i + 1;
      const isTop5 = rank <= 5;
      const minPrice = s.product.skus[0]?.min_sell_price;
      return {
        rank,
        product_id: s.product_id.toString(),
        title: isTop5 ? s.product.title : maskTitle(s.product.title),
        score: isTop5 ? Number(s.score) : null,
        weekly_bought: isTop5 ? s.weekly_bought : null,
        sell_price: isTop5 && minPrice ? Number(minPrice) : null,
        category_id: s.product.category_id?.toString() ?? null,
      };
    });

    this.setCache('public-top', items);
    return items;
  }

  async getPublicCategories() {
    const cached = this.getCache('public-categories');
    if (cached) return cached;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const snapshots = await this.prisma.productSnapshot.findMany({
      where: { snapshot_at: { gte: since } },
      orderBy: { score: 'desc' },
      take: 1000,
      distinct: ['product_id'],
      include: {
        product: {
          select: { title: true, category_id: true, category_path: true },
        },
      },
    });

    // Kategoriya bo'yicha guruhlash
    const byCategory = new Map<string, { catName: string; totalWeeklySold: number; products: typeof snapshots }>();
    for (const s of snapshots) {
      const catPath = s.product.category_path as Array<{ id: number; title: string }> | null;
      const leaf = catPath?.[catPath.length - 1];
      if (!leaf) continue; // category_path ham yo'q bo'lsa o'tkazib yuborish
      const catId = s.product.category_id?.toString() ?? leaf.id.toString();
      if (!byCategory.has(catId)) byCategory.set(catId, { catName: leaf.title, totalWeeklySold: 0, products: [] });
      const entry = byCategory.get(catId)!;
      entry.totalWeeklySold += s.weekly_bought ?? 0;
      entry.products.push(s);
    }

    // Umumiy haftalik sotuvlar bo'yicha tartiblash
    const sorted = [...byCategory.entries()].sort((a, b) => b[1].totalWeeklySold - a[1].totalWeeklySold);

    const result = sorted.slice(0, 20).map(([catId, entry], i) => {
      const top = entry.products[0];
      const category_name = entry.catName;
      return {
        rank: i + 1,
        category_id: catId,
        category_name,
        total_weekly_sold: entry.totalWeeklySold,
        product_count: entry.products.length,
        top_product: top ? {
          title: top.product.title,
          product_id: top.product_id.toString(),
          score: Number(top.score),
        } : null,
      };
    });

    this.setCache('public-categories', result);
    return result;
  }

  private getCache(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: unknown) {
    // Evict expired entries before adding
    for (const [k, v] of this.cache) {
      if (Date.now() > v.expiry) {
        this.cache.delete(k);
      }
    }
    // Evict oldest if at max capacity
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { data, expiry: Date.now() + this.TTL });
  }
}

function maskTitle(title: string): string {
  if (title.length <= 6) return title.slice(0, 3) + '***';
  const words = title.split(' ');
  if (words.length >= 2) {
    return words[0] + ' ' + words[1].slice(0, 3) + '***';
  }
  return title.slice(0, 6) + '***';
}
