import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const HAIKU_INPUT_COST = 0.80 / 1_000_000;
const HAIKU_OUTPUT_COST = 4.00 / 1_000_000;

export interface AiLogOpts {
  method: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  productId?: string;
  accountId?: string;
  userId?: string;
  durationMs?: number;
  error?: string;
}

@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkAiQuota(accountId: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { ai_monthly_limit_usd: true },
    });
    if (!account?.ai_monthly_limit_usd) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await this.prisma.aiUsageLog.aggregate({
      where: { account_id: accountId, created_at: { gte: monthStart } },
      _sum: { cost_usd: true },
    });

    const usedUsd = Number(usage._sum.cost_usd ?? 0);
    const limitUsd = Number(account.ai_monthly_limit_usd);

    if (usedUsd >= limitUsd) {
      throw new ForbiddenException(
        `AI oylik budget tugagan: $${usedUsd.toFixed(4)} / $${limitUsd.toFixed(2)}. Keyingi oyda yangilanadi.`,
      );
    }
  }

  async getAiUsage(accountId: string): Promise<{
    used_usd: number;
    limit_usd: number | null;
    remaining_usd: number | null;
    calls_this_month: number;
  }> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { ai_monthly_limit_usd: true },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await this.prisma.aiUsageLog.aggregate({
      where: { account_id: accountId, created_at: { gte: monthStart } },
      _sum: { cost_usd: true },
      _count: true,
    });

    const usedUsd = Number(usage._sum.cost_usd ?? 0);
    const limitUsd = account?.ai_monthly_limit_usd ? Number(account.ai_monthly_limit_usd) : null;

    return {
      used_usd: usedUsd,
      limit_usd: limitUsd,
      remaining_usd: limitUsd !== null ? Math.max(0, limitUsd - usedUsd) : null,
      calls_this_month: usage._count ?? 0,
    };
  }

  async logCall(opts: AiLogOpts): Promise<void> {
    try {
      const costUsd = opts.inputTokens * HAIKU_INPUT_COST + opts.outputTokens * HAIKU_OUTPUT_COST;
      await this.prisma.aiUsageLog.create({
        data: {
          method: opts.method,
          model: opts.model,
          input_tokens: opts.inputTokens,
          output_tokens: opts.outputTokens,
          cost_usd: costUsd,
          product_id: opts.productId,
          account_id: opts.accountId,
          user_id: opts.userId,
          duration_ms: opts.durationMs,
          error: opts.error,
        },
      });
    } catch (err: unknown) {
      this.logger.warn(`Failed to log AI usage: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
