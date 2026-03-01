import { Controller, Post, Get, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UzumService } from './uzum.service';
import { ProductsService } from '../products/products.service';
import { RequestLoggerService } from '../common/request-logger.service';

class AnalyzeUrlDto {
  @IsUrl()
  url!: string;
}

@ApiTags('uzum')
@ApiBearerAuth()
@Controller('uzum')
export class UzumController {
  constructor(
    private readonly uzumService: UzumService,
    private readonly productsService: ProductsService,
    private readonly reqLogger: RequestLoggerService,
  ) {}

  @Post('analyze')
  @UseGuards(JwtAuthGuard, BillingGuard)
  analyzeUrl(
    @Body() dto: AnalyzeUrlDto,
    @CurrentUser('account_id') accountId: string,
  ) {
    this.reqLogger.logAnalyze(accountId, dto.url);
    return this.uzumService.analyzeUrl(dto.url);
  }

  /** Fresh analyze by product ID — fetches from Uzum, saves snapshot, runs AI */
  @Get('product/:id')
  @UseGuards(JwtAuthGuard, BillingGuard)
  analyzeById(@Param('id') id: string) {
    return this.uzumService.analyzeProduct(Number(id));
  }

  /** Quick score for browser extension — lightweight, no billing guard */
  @Get('product/:productId/quick-score')
  @UseGuards(JwtAuthGuard)
  async quickScore(@Param('productId') productId: string) {
    const product = await this.productsService.getProductById(
      BigInt(productId),
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return {
      score: product.score,
      weekly_bought: product.weekly_bought,
      trend: null, // would need 2 snapshots for trend
      sell_price: product.sell_price,
      last_updated: product.last_updated,
    };
  }

  /** Batch quick-score — up to 50 products at once, DB-only (no Uzum API calls) */
  @Post('batch-quick-score')
  @UseGuards(JwtAuthGuard)
  async batchQuickScore(@Body() body: { product_ids: string[] }) {
    const MAX_BATCH_SIZE = 50;
    const ids = (body.product_ids || []).slice(0, MAX_BATCH_SIZE);
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const product = await this.productsService.getProductById(BigInt(id));
          if (!product) return { product_id: id, found: false };
          return {
            product_id: id,
            found: true,
            score: product.score,
            weekly_bought: product.weekly_bought,
            sell_price: product.sell_price?.toString(),
            photo_url: product.photo_url,
            title: product.title,
          };
        } catch {
          return { product_id: id, found: false };
        }
      }),
    );
    return { results };
  }
}
