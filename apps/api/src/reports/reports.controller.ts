import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /** Create a custom report */
  @Post()
  createReport(
    @CurrentUser('account_id') accountId: string,
    @Body() body: {
      title: string;
      description?: string;
      report_type: string;
      filters?: any;
      columns?: any;
      schedule?: string;
    },
  ) {
    return this.reportsService.createReport(accountId, body);
  }

  /** List all reports */
  @Get()
  listReports(@CurrentUser('account_id') accountId: string) {
    return this.reportsService.listReports(accountId);
  }

  /** Generate market share report (Feature 35) */
  @Get('market-share')
  getMarketShare(@Query('category_id') categoryId: string) {
    return this.reportsService.generateMarketShareReport(Number(categoryId));
  }

  /** Generate report data */
  @Get(':id/generate')
  generateReport(
    @CurrentUser('account_id') accountId: string,
    @Param('id') reportId: string,
  ) {
    return this.reportsService.generateReport(accountId, reportId);
  }

  /** Delete a report */
  @Delete(':id')
  deleteReport(
    @CurrentUser('account_id') accountId: string,
    @Param('id') reportId: string,
  ) {
    return this.reportsService.deleteReport(accountId, reportId);
  }
}
