import {
  Controller, Get, Post, Patch, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SignalsService } from './signals.service';

@ApiTags('signals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  /** Feature 21 — Cannibalization Alert */
  @Get('cannibalization')
  getCannibalization(@CurrentUser('account_id') accountId: string) {
    return this.signalsService.getCannibalization(accountId);
  }

  /** Feature 22 — Dead Stock Predictor */
  @Get('dead-stock')
  getDeadStock(@CurrentUser('account_id') accountId: string) {
    return this.signalsService.getDeadStockRisk(accountId);
  }

  /** Feature 23 — Category Saturation Index */
  @Get('saturation')
  getSaturation(@Query('category_id') categoryId: string) {
    return this.signalsService.getSaturation(Number(categoryId));
  }

  /** Feature 24 — Flash Sale Detector */
  @Get('flash-sales')
  getFlashSales(@CurrentUser('account_id') accountId: string) {
    return this.signalsService.getFlashSales(accountId);
  }

  /** Feature 25 — New Product Early Signal */
  @Get('early-signals')
  getEarlySignals(@CurrentUser('account_id') accountId: string) {
    return this.signalsService.getEarlySignals(accountId);
  }

  /** Feature 26 — Stock Cliff Alert */
  @Get('stock-cliffs')
  getStockCliffs(@CurrentUser('account_id') accountId: string) {
    return this.signalsService.getStockCliffs(accountId);
  }

  /** Feature 27 — Ranking Position Tracker */
  @Get('ranking/:productId')
  getRanking(@Param('productId') productId: string) {
    return this.signalsService.getRankingHistory(BigInt(productId));
  }

  /** Feature 28 — Product Launch Checklist */
  @Get('checklist')
  getChecklist(
    @CurrentUser('account_id') accountId: string,
    @Query('product_id') productId?: string,
  ) {
    return this.signalsService.getChecklist(accountId, productId);
  }

  @Post('checklist')
  saveChecklist(
    @CurrentUser('account_id') accountId: string,
    @Body() body: { product_id?: string; title: string; items: any[] },
  ) {
    return this.signalsService.saveChecklist(accountId, body);
  }

  /** Feature 29 — A/B Price Testing */
  @Post('price-tests')
  createPriceTest(
    @CurrentUser('account_id') accountId: string,
    @Body() body: { product_id: string; original_price: number; test_price: number },
  ) {
    return this.signalsService.createPriceTest(accountId, body);
  }

  @Get('price-tests')
  listPriceTests(@CurrentUser('account_id') accountId: string) {
    return this.signalsService.listPriceTests(accountId);
  }

  @Patch('price-tests/:id')
  updatePriceTest(
    @CurrentUser('account_id') accountId: string,
    @Param('id') testId: string,
    @Body() body: { status?: string; original_sales?: number; test_sales?: number; conclusion?: string },
  ) {
    return this.signalsService.updatePriceTest(accountId, testId, body);
  }

  /** Feature 30 — Replenishment Planner */
  @Get('replenishment')
  getReplenishment(
    @CurrentUser('account_id') accountId: string,
    @Query('lead_time_days') leadTimeDays?: string,
  ) {
    return this.signalsService.getReplenishmentPlan(
      accountId,
      leadTimeDays ? Number(leadTimeDays) : 14,
    );
  }
}
