import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { ToolsService } from './tools.service';
import { ProfitCalculatorDto } from './dto/profit-calculator.dto';

@ApiTags('tools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post('profit-calculator')
  profitCalculator(@Body() dto: ProfitCalculatorDto) {
    return this.toolsService.calculateProfit(dto);
  }

  @Post('price-elasticity')
  priceElasticity(@Body() dto: { price_old: number; price_new: number; qty_old: number; qty_new: number }) {
    return this.toolsService.calculateElasticity(dto);
  }

  @Post('generate-description')
  generateDescription(@Body() dto: {
    title: string;
    attributes?: Record<string, string | null>;
    category?: string;
    keywords?: string[];
  }) {
    return this.toolsService.generateDescription(dto);
  }

  @Post('analyze-sentiment')
  analyzeSentiment(@Body() dto: { productTitle: string; reviews: string[] }) {
    return this.toolsService.analyzeSentiment(dto);
  }
}
