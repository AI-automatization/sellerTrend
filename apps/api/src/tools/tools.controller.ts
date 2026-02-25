import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityAction } from '../common/decorators/activity-action.decorator';
import { AiService } from '../ai/ai.service';
import { ToolsService } from './tools.service';
import { ProfitCalculatorDto } from './dto/profit-calculator.dto';

@ApiTags('tools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('tools')
export class ToolsController {
  constructor(
    private readonly toolsService: ToolsService,
    private readonly aiService: AiService,
  ) {}

  @Post('profit-calculator')
  @ActivityAction('TOOL_PROFIT_CALC')
  profitCalculator(@Body() dto: ProfitCalculatorDto) {
    return this.toolsService.calculateProfit(dto);
  }

  @Post('price-elasticity')
  @ActivityAction('TOOL_PRICE_ELASTICITY')
  priceElasticity(@Body() dto: { price_old: number; price_new: number; qty_old: number; qty_new: number }) {
    return this.toolsService.calculateElasticity(dto);
  }

  @Post('generate-description')
  @ActivityAction('TOOL_AI_DESCRIPTION')
  async generateDescription(
    @Body() dto: {
      title: string;
      attributes?: Record<string, string | null>;
      category?: string;
      keywords?: string[];
    },
    @CurrentUser('account_id') accountId: string,
  ) {
    await this.aiService.checkAiQuota(accountId);
    return this.toolsService.generateDescription(dto);
  }

  @Post('analyze-sentiment')
  @ActivityAction('TOOL_AI_SENTIMENT')
  async analyzeSentiment(
    @Body() dto: { productTitle: string; reviews: string[] },
    @CurrentUser('account_id') accountId: string,
  ) {
    await this.aiService.checkAiQuota(accountId);
    return this.toolsService.analyzeSentiment(dto);
  }
}
