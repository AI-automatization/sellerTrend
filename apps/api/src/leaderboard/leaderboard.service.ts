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
          select: { title: true, category_id: true },
        },
      },
    });

    const items = snapshots.map((s, i) => {
      const rank = i + 1;
      const isTop5 = rank <= 5;
      return {
        rank,
        product_id: s.product_id.toString(),
        title: isTop5 ? s.product.title : maskTitle(s.product.title),
        score: isTop5 ? Number(s.score) : null,
        weekly_bought: isTop5 ? s.weekly_bought : null,
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
      take: 500,
      distinct: ['product_id'],
      include: {
        product: {
          select: { title: true, category_id: true },
        },
      },
    });

    const byCategory = new Map<string, typeof snapshots>();
    for (const s of snapshots) {
      const catId = s.product.category_id?.toString() ?? 'unknown';
      if (!byCategory.has(catId)) byCategory.set(catId, []);
      byCategory.get(catId)!.push(s);
    }

    const result: Array<{ category_id: string; top: Array<{ rank: number; product_id: string; title: string; score: number; weekly_bought: number | null }> }> = [];
    for (const [catId, items] of byCategory.entries()) {
      result.push({
        category_id: catId,
        top: items.slice(0, 3).map((s, i) => ({
          rank: i + 1,
          product_id: s.product_id.toString(),
          title: s.product.title,
          score: Number(s.score),
          weekly_bought: s.weekly_bought,
        })),
      });
    }

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
