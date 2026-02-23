import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdsService } from './ads.service';

@ApiTags('ads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /** Create a new ad campaign */
  @Post('campaigns')
  createCampaign(
    @CurrentUser('account_id') accountId: string,
    @Body() body: {
      name: string;
      product_id?: string;
      platform?: string;
      budget_uzs?: number;
      start_date?: string;
      end_date?: string;
    },
  ) {
    return this.adsService.createCampaign(accountId, body);
  }

  /** List all campaigns */
  @Get('campaigns')
  listCampaigns(@CurrentUser('account_id') accountId: string) {
    return this.adsService.listCampaigns(accountId);
  }

  /** Update campaign stats */
  @Patch('campaigns/:id')
  updateCampaign(
    @CurrentUser('account_id') accountId: string,
    @Param('id') campaignId: string,
    @Body() body: {
      name?: string;
      status?: string;
      spent_uzs?: number;
      impressions?: number;
      clicks?: number;
      conversions?: number;
      revenue_uzs?: number;
      budget_uzs?: number;
      start_date?: string;
      end_date?: string;
    },
  ) {
    return this.adsService.updateCampaign(accountId, campaignId, body);
  }

  /** Get ROI calculation for a campaign */
  @Get('campaigns/:id/roi')
  getCampaignROI(
    @CurrentUser('account_id') accountId: string,
    @Param('id') campaignId: string,
  ) {
    return this.adsService.getCampaignROI(accountId, campaignId);
  }

  /** Delete a campaign */
  @Delete('campaigns/:id')
  deleteCampaign(
    @CurrentUser('account_id') accountId: string,
    @Param('id') campaignId: string,
  ) {
    return this.adsService.deleteCampaign(accountId, campaignId);
  }
}
