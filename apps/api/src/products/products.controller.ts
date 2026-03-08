import { Controller, Get, Post, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityAction } from '../common/decorators/activity-action.decorator';
import { NoBilling } from '../common/decorators/no-billing.decorator';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { ProductsService } from './products.service';
import { AiService } from '../ai/ai.service';
import { RecommendationsQueryDto } from './dto/recommendations-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';

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

  /** 4-layer fallback recommendations for onboarding / new users */
  @Get('recommendations')
  getRecommendations(
    @CurrentUser('account_id') accountId: string,
    @Query() query: RecommendationsQueryDto,
  ) {
    return this.productsService.getRecommendations(accountId, query.niche, query.limit);
  }

  /** Uzum search proxy with 5-min Redis cache */
  @Get('search')
  @NoBilling()
  searchProducts(
    @CurrentUser('account_id') _accountId: string,
    @Query() query: SearchQueryDto,
  ) {
    return this.productsService.searchProducts(query.q, query.limit);
  }

  /** Track a product from search results — creates Product if missing */
  @Post('search/:uzumId/track')
  @ActivityAction('PRODUCT_TRACK')
  trackFromSearch(
    @CurrentUser('account_id') accountId: string,
    @Param('uzumId', ParseBigIntPipe) uzumId: bigint,
  ) {
    return this.productsService.trackFromSearch(accountId, Number(uzumId));
  }

  @Get(':id')
  async getProduct(
    @Param('id', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ) {
    const product = await this.productsService.getProductById(productId, accountId);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @Post(':id/track')
  @ActivityAction('PRODUCT_TRACK')
  track(
    @CurrentUser('account_id') accountId: string,
    @Param('id', ParseBigIntPipe) productId: bigint,
  ) {
    return this.productsService.trackProduct(accountId, productId);
  }

  /** Revenue estimator: monthly revenue, margin, competition level */
  @Get(':id/revenue-estimate')
  revenueEstimate(
    @Param('id', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.productsService.getRevenueEstimate(productId, accountId);
  }

  @Get(':id/snapshots')
  snapshots(
    @Param('id', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.productsService.getProductSnapshots(productId, accountId);
  }

  /** 7-day score forecast with trend direction */
  @Get(':id/forecast')
  forecast(
    @Param('id', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.productsService.getForecast(productId, accountId);
  }

  /** ML-enhanced ensemble forecast with confidence intervals */
  @Get(':id/ml-forecast')
  mlForecast(
    @Param('id', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.productsService.getAdvancedForecast(productId, accountId);
  }

  /** Weekly trend: 7-day delta, daily breakdown, seller advice */
  @Get(':id/weekly-trend')
  weeklyTrend(
    @Param('id', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.productsService.getWeeklyTrend(productId, accountId);
  }

  /** AI-powered trend analysis */
  @Get(':id/trend-analysis')
  @ActivityAction('PRODUCT_TREND_ANALYSIS')
  async trendAnalysis(
    @Param('id', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ) {
    const forecast = await this.productsService.getAdvancedForecast(productId, accountId);
    const product = await this.productsService.getProductById(productId, accountId);
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
