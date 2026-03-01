import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityAction } from '../common/decorators/activity-action.decorator';
import { SourcingService } from './sourcing.service';
import { CalculateCargoDto } from './dto/calculate-cargo.dto';
import { SearchPricesDto } from './dto/search-prices.dto';
import { CreateSearchJobDto } from './dto/create-search-job.dto';

@ApiTags('sourcing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('sourcing')
export class SourcingController {
  constructor(private readonly sourcingService: SourcingService) {}

  /** Valyuta kurslari (CBU) */
  @Get('currency-rates')
  getCurrencyRates() {
    return this.sourcingService.getCurrencyRates();
  }

  /** Valyuta kurslarini yangilash */
  @Post('currency-rates/refresh')
  refreshRates() {
    return this.sourcingService.refreshCurrencyRates();
  }

  /** Cargo provayderlar ro'yxati */
  @Get('cargo/providers')
  getProviders(@Query('origin') origin?: string) {
    return this.sourcingService.getCargoProviders(origin);
  }

  /** Cargo narxini hisoblash */
  @Post('cargo/calculate')
  @ActivityAction('SOURCING_CARGO_CALC')
  calculate(
    @Body() body: CalculateCargoDto,
    @CurrentUser('account_id') account_id: string,
  ) {
    return this.sourcingService.calculateCargo({ ...body, account_id });
  }

  /** Quick narx qidirish (Playwright, backward compat) */
  @Post('search')
  @ActivityAction('SOURCING_SEARCH')
  search(
    @Body() body: SearchPricesDto,
    @CurrentUser('account_id') account_id: string,
  ) {
    return this.sourcingService.searchExternalPrices(
      body.query,
      account_id,
    );
  }

  /** Full sourcing job — AI query gen + multi-platform search + scoring */
  @Post('jobs')
  @ActivityAction('SOURCING_JOB_CREATE')
  createJob(
    @Body() body: CreateSearchJobDto,
    @CurrentUser('account_id') account_id: string,
  ) {
    return this.sourcingService.createSearchJob({
      account_id,
      product_id: body.product_id,
      product_title: body.product_title,
      platforms: body.platforms,
    });
  }

  /** Get job status and results */
  @Get('jobs/:id')
  getJob(
    @Param('id') id: string,
    @CurrentUser('account_id') account_id: string,
  ) {
    return this.sourcingService.getSearchJob(id, account_id);
  }

  /** List recent search jobs */
  @Get('jobs')
  listJobs(@CurrentUser('account_id') account_id: string) {
    return this.sourcingService.listSearchJobs(account_id);
  }

  /** Available platforms */
  @Get('platforms')
  getPlatforms() {
    return this.sourcingService.getPlatforms();
  }

  /** Oxirgi hisoblashlar tarixi */
  @Get('history')
  history(@CurrentUser('account_id') account_id: string) {
    return this.sourcingService.getHistory(account_id);
  }
}
