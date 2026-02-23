import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Create a new watchlist */
  async createWatchlist(
    accountId: string,
    data: { name: string; description?: string; product_ids: string[] },
  ) {
    const watchlist = await this.prisma.sharedWatchlist.create({
      data: {
        account_id: accountId,
        name: data.name,
        description: data.description ?? null,
        product_ids: data.product_ids,
      },
    });

    return {
      id: watchlist.id,
      name: watchlist.name,
      description: watchlist.description,
      product_ids: watchlist.product_ids,
      is_public: watchlist.is_public,
      views: watchlist.views,
      created_at: watchlist.created_at,
    };
  }

  /** List watchlists for an account */
  async listWatchlists(accountId: string) {
    const watchlists = await this.prisma.sharedWatchlist.findMany({
      where: { account_id: accountId },
      orderBy: { created_at: 'desc' },
    });

    return watchlists.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      product_ids: w.product_ids,
      is_public: w.is_public,
      share_token: w.share_token,
      views: w.views,
      created_at: w.created_at,
      updated_at: w.updated_at,
    }));
  }

  /** Share a watchlist — generate token and set is_public=true */
  async shareWatchlist(accountId: string, watchlistId: string) {
    const watchlist = await this.prisma.sharedWatchlist.findFirst({
      where: { id: watchlistId, account_id: accountId },
    });

    if (!watchlist) {
      throw new NotFoundException(`Watchlist ${watchlistId} not found`);
    }

    // If already shared, return existing token
    if (watchlist.share_token) {
      return {
        id: watchlist.id,
        share_token: watchlist.share_token,
        is_public: true,
      };
    }

    const shareToken = crypto.randomBytes(32).toString('hex');

    const updated = await this.prisma.sharedWatchlist.update({
      where: { id: watchlistId },
      data: {
        share_token: shareToken,
        is_public: true,
      },
    });

    return {
      id: updated.id,
      share_token: updated.share_token,
      is_public: updated.is_public,
    };
  }

  /** Get a shared watchlist by token (public, no auth) */
  async getSharedWatchlist(token: string) {
    const watchlist = await this.prisma.sharedWatchlist.findUnique({
      where: { share_token: token },
    });

    if (!watchlist || !watchlist.is_public) {
      throw new NotFoundException('Shared watchlist not found');
    }

    // Increment views
    await this.prisma.sharedWatchlist.update({
      where: { id: watchlist.id },
      data: { views: { increment: 1 } },
    });

    // Fetch product details
    const productIds = (watchlist.product_ids as string[]) ?? [];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds.map((id) => BigInt(id)) },
      },
      include: {
        snapshots: { orderBy: { snapshot_at: 'desc' }, take: 1 },
        skus: { take: 1, orderBy: { min_sell_price: 'asc' } },
        shop: { select: { title: true } },
      },
    });

    return {
      id: watchlist.id,
      name: watchlist.name,
      description: watchlist.description,
      views: watchlist.views + 1,
      created_at: watchlist.created_at,
      products: products.map((p) => {
        const snap = p.snapshots[0];
        const sku = p.skus[0];
        return {
          product_id: p.id.toString(),
          title: p.title,
          shop_name: p.shop?.title ?? null,
          rating: p.rating ? Number(p.rating) : null,
          orders_quantity: p.orders_quantity ? Number(p.orders_quantity) : 0,
          weekly_bought: snap?.weekly_bought ?? 0,
          score: snap?.score ? Number(snap.score) : 0,
          sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
        };
      }),
    };
  }

  /** Delete a watchlist */
  async deleteWatchlist(accountId: string, watchlistId: string) {
    const watchlist = await this.prisma.sharedWatchlist.findFirst({
      where: { id: watchlistId, account_id: accountId },
    });

    if (!watchlist) {
      throw new NotFoundException(`Watchlist ${watchlistId} not found`);
    }

    await this.prisma.sharedWatchlist.delete({
      where: { id: watchlistId },
    });

    return { message: 'Watchlist deleted' };
  }
}
