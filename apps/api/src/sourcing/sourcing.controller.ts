import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SourcingService } from './sourcing.service';

@ApiTags('sourcing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  calculate(
    @Body()
    body: {
      item_name?: string;
      item_cost_usd: number;
      weight_kg: number;
      quantity: number;
      provider_id: string;
      customs_rate?: number;
      sell_price_uzs?: number;
    },
    @CurrentUser('account_id') account_id: string,
  ) {
    return this.sourcingService.calculateCargo({ ...body, account_id });
  }

  /** Xitoy/Global bozorda narx qidirish */
  @Post('search')
  search(
    @Body() body: { query: string; source: string },
    @CurrentUser('account_id') account_id: string,
  ) {
    return this.sourcingService.searchExternalPrices(
      body.query,
      body.source || 'ALIBABA',
      account_id,
    );
  }

  /** Oxirgi hisoblashlar tarixi */
  @Get('history')
  history(@CurrentUser('account_id') account_id: string) {
    return this.sourcingService.getHistory(account_id);
  }
}
