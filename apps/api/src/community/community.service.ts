import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Create a new community insight */
  async createInsight(
    accountId: string,
    data: { title: string; content: string; category: string },
  ) {
    const insight = await this.prisma.communityInsight.create({
      data: {
        account_id: accountId,
        title: data.title,
        content: data.content,
        category: data.category,
      },
    });

    return {
      id: insight.id,
      title: insight.title,
      content: insight.content,
      category: insight.category,
      upvotes: insight.upvotes,
      downvotes: insight.downvotes,
      created_at: insight.created_at,
    };
  }

  /** List insights, optionally filtered by category, ordered by net votes */
  async listInsights(category?: string, page = 1, limit = 50, sort?: string) {
    const MAX_COMMUNITY_INSIGHTS = 50;
    const take = Math.min(limit, MAX_COMMUNITY_INSIGHTS);
    const skip = (page - 1) * take;

    const where: Prisma.CommunityInsightWhereInput = {};
    if (category) {
      where.category = category;
    }

    type InsightOrderBy = Prisma.CommunityInsightOrderByWithRelationInput;
    let orderBy: InsightOrderBy[];
    switch (sort) {
      case 'newest':
        orderBy = [{ created_at: 'desc' }];
        break;
      case 'oldest':
        orderBy = [{ created_at: 'asc' }];
        break;
      case 'votes':
      default:
        orderBy = [{ upvotes: 'desc' }, { downvotes: 'asc' }, { created_at: 'desc' }];
        break;
    }

    const [insights, total] = await Promise.all([
      this.prisma.communityInsight.findMany({
        where,
        take,
        skip,
        orderBy,
        include: {
          account: { select: { name: true } },
        },
      }),
      this.prisma.communityInsight.count({ where }),
    ]);

    return {
      data: insights.map((i) => ({
        id: i.id,
        title: i.title,
        content: i.content,
        category: i.category,
        author: i.account.name,
        upvotes: i.upvotes,
        downvotes: i.downvotes,
        net_votes: i.upvotes - i.downvotes,
        created_at: i.created_at,
      })),
      total,
      page,
      limit: take,
      pages: Math.ceil(total / take),
    };
  }

  /**
   * Vote on an insight (+1 or -1).
   * Uses ReadCommitted transaction to atomically check + create/update vote + counter.
   */
  async vote(accountId: string, insightId: string, vote: number) {
    // Normalize vote to +1 or -1
    const normalizedVote = vote > 0 ? 1 : -1;

    return this.prisma.$transaction(async (tx) => {
      const insight = await tx.communityInsight.findUnique({
        where: { id: insightId },
      });

      if (!insight) {
        throw new NotFoundException(`Insight ${insightId} not found`);
      }

      // Check for existing vote
      const existingVote = await tx.insightVote.findUnique({
        where: {
          insight_id_account_id: {
            insight_id: insightId,
            account_id: accountId,
          },
        },
      });

      if (existingVote) {
        if (existingVote.vote === normalizedVote) {
          // Same vote — no change
          return {
            insight_id: insightId,
            vote: normalizedVote,
            message: 'Vote unchanged',
            upvotes: insight.upvotes,
            downvotes: insight.downvotes,
            net_votes: insight.upvotes - insight.downvotes,
          };
        }

        // Update existing vote
        await tx.insightVote.update({
          where: { id: existingVote.id },
          data: { vote: normalizedVote },
        });

        // Swap counters: decrement old direction, increment new
        const updated = existingVote.vote === 1
          ? await tx.communityInsight.update({
              where: { id: insightId },
              data: { upvotes: { decrement: 1 }, downvotes: { increment: 1 } },
            })
          : await tx.communityInsight.update({
              where: { id: insightId },
              data: { upvotes: { increment: 1 }, downvotes: { decrement: 1 } },
            });

        return {
          insight_id: insightId,
          vote: normalizedVote,
          upvotes: updated.upvotes,
          downvotes: updated.downvotes,
          net_votes: updated.upvotes - updated.downvotes,
        };
      }

      // Create new vote
      await tx.insightVote.create({
        data: {
          insight_id: insightId,
          account_id: accountId,
          vote: normalizedVote,
        },
      });

      // Update counter atomically and return result
      const updated = normalizedVote === 1
        ? await tx.communityInsight.update({
            where: { id: insightId },
            data: { upvotes: { increment: 1 } },
          })
        : await tx.communityInsight.update({
            where: { id: insightId },
            data: { downvotes: { increment: 1 } },
          });

      return {
        insight_id: insightId,
        vote: normalizedVote,
        upvotes: updated.upvotes,
        downvotes: updated.downvotes,
        net_votes: updated.upvotes - updated.downvotes,
      };
    }, { isolationLevel: 'ReadCommitted' });
  }

  /** Get distinct categories from insights */
  async getCategories() {
    const insights = await this.prisma.communityInsight.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return insights.map((i) => i.category);
  }
}
