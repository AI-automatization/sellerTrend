import { Controller, Post, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { PlanGuard } from '../billing/plan.guard';
import { RequiresPlan } from '../billing/requires-plan.decorator';
import { AiThrottlerGuard } from '../common/guards/ai-throttler.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

/** T-239: Per-account rate limiting constants for AI endpoints (req/min) */
const AI_CACHED_LIMIT = 30;
const AI_EXTRACT_LIMIT = 10;
const AI_TTL_MS = 60000;

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard, PlanGuard, AiThrottlerGuard)
@RequiresPlan('MAX')
@Throttle({ ai: { ttl: AI_TTL_MS, limit: AI_CACHED_LIMIT } })
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  /** Verify that the given product is tracked by the given account */
  private async assertProductOwnership(productId: bigint, accountId: string): Promise<void> {
    const tracked = await this.prisma.trackedProduct.findUnique({
      where: {
        account_id_product_id: {
          account_id: accountId,
          product_id: productId,
        },
      },
      select: { id: true },
    });
    if (!tracked) {
      throw new NotFoundException('Product not found');
    }
  }

  /** Get cached AI attributes for a product (30 req/min per account) */
  @Get('attributes/:productId')
  async getAttributes(
    @Param('productId', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ) {
    await this.assertProductOwnership(productId, accountId);
    const attr = await this.prisma.productAiAttribute.findUnique({
      where: { product_id: productId },
    });
    if (!attr) return null;
    return { ...attr, product_id: attr.product_id.toString() };
  }

  /** Trigger attribute extraction for a product — Anthropic API call (10 req/min per account) */
  @Throttle({ ai: { ttl: AI_TTL_MS, limit: AI_EXTRACT_LIMIT } })
  @Post('attributes/:productId/extract')
  async extractAttributes(
    @Param('productId', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ) {
    await this.assertProductOwnership(productId, accountId);
    await this.aiService.checkAiQuota(accountId);
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { id: true, title: true },
    });
    return this.aiService.extractAttributes(product.id, product.title);
  }

  /** Get all AI explanations for a product (30 req/min per account) */
  @Get('explanations/:productId')
  async getExplanations(
    @Param('productId', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ) {
    await this.assertProductOwnership(productId, accountId);
    const rows = await this.prisma.productAiExplanation.findMany({
      where: { product_id: productId },
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
