import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  /** Get cached AI attributes for a product */
  @Get('attributes/:productId')
  async getAttributes(@Param('productId') productId: string) {
    const attr = await this.prisma.productAiAttribute.findUnique({
      where: { product_id: BigInt(productId) },
    });
    if (!attr) return null;
    return { ...attr, product_id: attr.product_id.toString() };
  }

  /** Trigger attribute extraction for a product (idempotent, quota-checked) */
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

  /** Get all AI explanations for a product */
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
      bullets: r.explanation ? (() => { try { return JSON.parse(r.explanation!); } catch { return [r.explanation]; } })() : [],
    }));
  }

  /** Get current month AI usage for the account */
  @Get('usage')
  async getUsage(@CurrentUser('account_id') accountId: string) {
    return this.aiService.getAiUsage(accountId);
  }
}
