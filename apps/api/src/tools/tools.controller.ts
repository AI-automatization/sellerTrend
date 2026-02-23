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
}
