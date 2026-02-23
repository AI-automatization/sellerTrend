import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  async listInsights(category?: string) {
    const where: any = {};
    if (category) {
      where.category = category;
    }

    const insights = await this.prisma.communityInsight.findMany({
      where,
      orderBy: [
        // Order by net votes (upvotes - downvotes) desc
        // Since Prisma doesn't support computed fields in orderBy,
        // we fetch all and sort in-memory
        { created_at: 'desc' },
      ],
      include: {
        account: { select: { name: true } },
      },
    });

    // Sort by net votes (upvotes - downvotes) descending
    return insights
      .map((i) => ({
        id: i.id,
        title: i.title,
        content: i.content,
        category: i.category,
        author: i.account.name,
        upvotes: i.upvotes,
        downvotes: i.downvotes,
        net_votes: i.upvotes - i.downvotes,
        created_at: i.created_at,
      }))
      .sort((a, b) => b.net_votes - a.net_votes);
  }

  /** Vote on an insight (+1 or -1) — upsert to prevent duplicate votes */
  async vote(accountId: string, insightId: string, vote: number) {
    const insight = await this.prisma.communityInsight.findUnique({
      where: { id: insightId },
    });

    if (!insight) {
      throw new NotFoundException(`Insight ${insightId} not found`);
    }

    // Normalize vote to +1 or -1
    const normalizedVote = vote > 0 ? 1 : -1;

    // Check for existing vote
    const existingVote = await this.prisma.insightVote.findUnique({
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
        };
      }

      // Update existing vote
      await this.prisma.insightVote.update({
        where: { id: existingVote.id },
        data: { vote: normalizedVote },
      });

      // Update counters: remove old vote, add new vote
      const counterUpdate: any = {};
      if (existingVote.vote === 1) {
        counterUpdate.upvotes = { decrement: 1 };
      } else {
        counterUpdate.downvotes = { decrement: 1 };
      }
      if (normalizedVote === 1) {
        counterUpdate.upvotes = { ...(counterUpdate.upvotes ?? {}), increment: 1 };
      } else {
        counterUpdate.downvotes = { ...(counterUpdate.downvotes ?? {}), increment: 1 };
      }

      // Use two separate updates to handle counter changes correctly
      if (existingVote.vote === 1) {
        await this.prisma.communityInsight.update({
          where: { id: insightId },
          data: { upvotes: { decrement: 1 }, downvotes: { increment: 1 } },
        });
      } else {
        await this.prisma.communityInsight.update({
          where: { id: insightId },
          data: { upvotes: { increment: 1 }, downvotes: { decrement: 1 } },
        });
      }
    } else {
      // Create new vote
      await this.prisma.insightVote.create({
        data: {
          insight_id: insightId,
          account_id: accountId,
          vote: normalizedVote,
        },
      });

      // Update counter
      if (normalizedVote === 1) {
        await this.prisma.communityInsight.update({
          where: { id: insightId },
          data: { upvotes: { increment: 1 } },
        });
      } else {
        await this.prisma.communityInsight.update({
          where: { id: insightId },
          data: { downvotes: { increment: 1 } },
        });
      }
    }

    // Return updated insight
    const updated = await this.prisma.communityInsight.findUnique({
      where: { id: insightId },
    });

    return {
      insight_id: insightId,
      vote: normalizedVote,
      upvotes: updated!.upvotes,
      downvotes: updated!.downvotes,
      net_votes: updated!.upvotes - updated!.downvotes,
    };
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
