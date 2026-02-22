import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UzumService } from './uzum.service';
import { RequestLoggerService } from '../common/request-logger.service';

class AnalyzeUrlDto {
  @IsUrl()
  url!: string;
}

@ApiTags('uzum')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('uzum')
export class UzumController {
  constructor(
    private readonly uzumService: UzumService,
    private readonly reqLogger: RequestLoggerService,
  ) {}

  @Post('analyze')
  analyzeUrl(
    @Body() dto: AnalyzeUrlDto,
    @CurrentUser('account_id') accountId: string,
  ) {
    this.reqLogger.logAnalyze(accountId, dto.url);
    return this.uzumService.analyzeUrl(dto.url);
  }
}
