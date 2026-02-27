import { Controller, Get, Post, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityAction } from '../common/decorators/activity-action.decorator';
import { ProductsService } from './products.service';
import { AiService } from '../ai/ai.service';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly aiService: AiService,
  ) {}

  @Get('tracked')
  getTracked(@CurrentUser('account_id') accountId: string) {
    return this.productsService.getTrackedProducts(accountId);
  }

  @Get(':id')
  async getProduct(
    @Param('id') productId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    const product = await this.productsService.getProductById(BigInt(productId), accountId);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @Post(':id/track')
  @ActivityAction('PRODUCT_TRACK')
  track(
    @CurrentUser('account_id') accountId: string,
    @Param('id') productId: string,
  ) {
    return this.productsService.trackProduct(accountId, BigInt(productId));
  }

  @Get(':id/snapshots')
  snapshots(@Param('id') productId: string) {
    return this.productsService.getProductSnapshots(BigInt(productId));
  }

  /** 7-day score forecast with trend direction */
  @Get(':id/forecast')
  forecast(@Param('id') productId: string) {
    return this.productsService.getForecast(BigInt(productId));
  }

  /** ML-enhanced ensemble forecast with confidence intervals */
  @Get(':id/ml-forecast')
  mlForecast(@Param('id') productId: string) {
    return this.productsService.getAdvancedForecast(BigInt(productId));
  }

  /** Weekly trend: 7-day delta, daily breakdown, seller advice */
  @Get(':id/weekly-trend')
  weeklyTrend(@Param('id') productId: string) {
    return this.productsService.getWeeklyTrend(BigInt(productId));
  }

  /** AI-powered trend analysis */
  @Get(':id/trend-analysis')
  @ActivityAction('PRODUCT_TREND_ANALYSIS')
  async trendAnalysis(@Param('id') productId: string) {
    const forecast = await this.productsService.getAdvancedForecast(BigInt(productId));
    const product = await this.productsService.getProductById(BigInt(productId));
    if (!product) throw new NotFoundException('Product not found');

    const analysis = await this.aiService.analyzeTrend({
      productTitle: product.title,
      snapshots: forecast.snapshots,
      forecastTrend: forecast.score_forecast.trend,
    });

    return {
      ...analysis,
      forecast_summary: {
        trend: forecast.score_forecast.trend,
        confidence: forecast.score_forecast.confidence,
        predicted_score_7d: forecast.score_forecast.predictions[6]?.value ?? null,
        predicted_sales_7d: forecast.sales_forecast.predictions[6]?.value ?? null,
      },
    };
  }
}
