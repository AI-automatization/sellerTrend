import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { PredictionsService, PredictionResult, RiskResult } from './predictions.service';

@ApiTags('predictions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get(':productId')
  getProductPrediction(
    @Param('productId', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
    @Query('horizon') horizon = 7,
  ): Promise<PredictionResult> {
    return this.predictionsService.getProductPrediction(productId, Number(horizon), accountId);
  }

  @Get(':productId/risk')
  getRiskScore(
    @Param('productId', ParseBigIntPipe) productId: bigint,
    @CurrentUser('account_id') accountId: string,
  ): Promise<RiskResult | null> {
    return this.predictionsService.getRiskScore(productId, accountId);
  }
}
