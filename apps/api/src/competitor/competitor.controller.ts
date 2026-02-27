import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CompetitorService } from './competitor.service';
import { TrackCompetitorsDto } from './dto/track-competitors.dto';

@ApiTags('competitor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('competitor')
export class CompetitorController {
  constructor(private readonly competitorService: CompetitorService) {}

  /** Discover competitors in the same category (live Uzum data) */
  @Get('products/:productId/prices')
  discoverPrices(
    @Param('productId') productId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.competitorService.discoverCompetitorPrices(
      BigInt(productId),
      accountId,
    );
  }

  /** Start tracking competitor products */
  @Post('track')
  trackCompetitors(
    @Body() dto: TrackCompetitorsDto,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.competitorService.trackCompetitors(
      accountId,
      dto.product_id,
      dto.competitor_product_ids,
    );
  }

  /** Get tracked competitors with latest prices */
  @Get('products/:productId/tracked')
  getTracked(
    @Param('productId') productId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.competitorService.getTrackedCompetitors(
      BigInt(productId),
      accountId,
    );
  }

  /** Get price history for a competitor (chart data) */
  @Get('products/:productId/history')
  getHistory(
    @Param('productId') productId: string,
    @Query('competitor_id') competitorId: string,
    @CurrentUser('account_id') accountId: string,
    @Query('limit') limit?: string,
  ) {
    if (!competitorId) {
      return { error: 'competitor_id query param is required' };
    }
    return this.competitorService.getCompetitorPriceHistory(
      BigInt(productId),
      BigInt(competitorId),
      accountId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** Get price history for a specific competitor */
  @Get('products/:productId/competitors/:competitorId/history')
  getCompetitorHistory(
    @Param('productId') productId: string,
    @Param('competitorId') competitorId: string,
    @CurrentUser('account_id') accountId: string,
    @Query('limit') limit?: string,
  ) {
    return this.competitorService.getCompetitorPriceHistory(
      BigInt(productId),
      BigInt(competitorId),
      accountId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** Stop tracking a competitor */
  @Delete('products/:productId/competitors/:competitorId')
  untrack(
    @Param('productId') productId: string,
    @Param('competitorId') competitorId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.competitorService.untrackCompetitor(
      BigInt(productId),
      BigInt(competitorId),
      accountId,
    );
  }
}
