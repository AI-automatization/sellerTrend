import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { AiThrottlerGuard } from '../common/guards/ai-throttler.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

/** T-239: Per-account rate limiting constants for AI endpoints (req/min) */
const AI_CACHED_LIMIT = 30;
const AI_EXTRACT_LIMIT = 10;
const AI_TTL_MS = 60000;

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard, AiThrottlerGuard)
@Throttle({ ai: { ttl: AI_TTL_MS, limit: AI_CACHED_LIMIT } })
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  /** Get cached AI attributes for a product (30 req/min per account) */
  @Get('attributes/:productId')
  async getAttributes(@Param('productId') productId: string) {
    const attr = await this.prisma.productAiAttribute.findUnique({
      where: { product_id: BigInt(productId) },
    });
    if (!attr) return null;
    return { ...attr, product_id: attr.product_id.toString() };
  }

  /** Trigger attribute extraction for a product — Anthropic API call (10 req/min per account) */
  @Throttle({ ai: { ttl: AI_TTL_MS, limit: AI_EXTRACT_LIMIT } })
  @Post('attributes/:productId/extract')
  async extractAttributes(
    @Param('productId') productId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    await this.aiService.checkAiQuota(accountId);
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: BigInt(productId) },
      select: { id: true, title: true },
    });
    return this.aiService.extractAttributes(product.id, product.title);
  }

  /** Get all AI explanations for a product (30 req/min per account) */
  @Get('explanations/:productId')
  async getExplanations(@Param('productId') productId: string) {
    const rows = await this.prisma.productAiExplanation.findMany({
      where: { product_id: BigInt(productId) },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
    return rows.map((r) => ({
      ...r,
      product_id: r.product_id.toString(),
      bullets: r.explanation
        ? (() => {
            try {
              return JSON.parse(r.explanation);
            } catch {
              return [r.explanation];
            }
          })()
        : [],
    }));
  }

  /** Get current month AI usage for the account (30 req/min per account) */
  @Get('usage')
  async getUsage(@CurrentUser('account_id') accountId: string) {
    return this.aiService.getAiUsage(accountId);
  }
}
