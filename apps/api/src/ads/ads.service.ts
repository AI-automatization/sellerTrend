import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Create a new ad campaign */
  async createCampaign(
    accountId: string,
    data: {
      name: string;
      product_id?: string;
      platform?: string;
      budget_uzs?: number;
      start_date?: string;
      end_date?: string;
    },
  ) {
    const campaign = await this.prisma.adCampaign.create({
      data: {
        account_id: accountId,
        name: data.name,
        product_id: data.product_id ? BigInt(data.product_id) : null,
        platform: data.platform ?? 'uzum',
        budget_uzs: data.budget_uzs ? BigInt(data.budget_uzs) : BigInt(0),
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
      },
    });

    return {
      id: campaign.id,
      name: campaign.name,
      product_id: campaign.product_id?.toString() ?? null,
      platform: campaign.platform,
      budget_uzs: Number(campaign.budget_uzs),
      status: campaign.status,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      created_at: campaign.created_at,
    };
  }

  /** List all campaigns for an account */
  async listCampaigns(accountId: string) {
    const campaigns = await this.prisma.adCampaign.findMany({
      where: { account_id: accountId },
      orderBy: { created_at: 'desc' },
    });

    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      product_id: c.product_id?.toString() ?? null,
      platform: c.platform,
      budget_uzs: Number(c.budget_uzs),
      spent_uzs: Number(c.spent_uzs),
      impressions: c.impressions,
      clicks: c.clicks,
      conversions: c.conversions,
      revenue_uzs: Number(c.revenue_uzs),
      status: c.status,
      start_date: c.start_date,
      end_date: c.end_date,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  }

  /** Update campaign stats (spent, impressions, clicks, conversions, revenue) */
  async updateCampaign(
    accountId: string,
    campaignId: string,
    data: {
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
    const campaign = await this.prisma.adCampaign.findFirst({
      where: { id: campaignId, account_id: accountId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.spent_uzs !== undefined) updateData.spent_uzs = BigInt(data.spent_uzs);
    if (data.impressions !== undefined) updateData.impressions = data.impressions;
    if (data.clicks !== undefined) updateData.clicks = data.clicks;
    if (data.conversions !== undefined) updateData.conversions = data.conversions;
    if (data.revenue_uzs !== undefined) updateData.revenue_uzs = BigInt(data.revenue_uzs);
    if (data.budget_uzs !== undefined) updateData.budget_uzs = BigInt(data.budget_uzs);
    if (data.start_date !== undefined) updateData.start_date = new Date(data.start_date);
    if (data.end_date !== undefined) updateData.end_date = new Date(data.end_date);

    const updated = await this.prisma.adCampaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.name,
      product_id: updated.product_id?.toString() ?? null,
      platform: updated.platform,
      budget_uzs: Number(updated.budget_uzs),
      spent_uzs: Number(updated.spent_uzs),
      impressions: updated.impressions,
      clicks: updated.clicks,
      conversions: updated.conversions,
      revenue_uzs: Number(updated.revenue_uzs),
      status: updated.status,
      start_date: updated.start_date,
      end_date: updated.end_date,
      updated_at: updated.updated_at,
    };
  }

  /** Calculate ROI metrics for a campaign */
  async getCampaignROI(accountId: string, campaignId: string) {
    const campaign = await this.prisma.adCampaign.findFirst({
      where: { id: campaignId, account_id: accountId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const spent = Number(campaign.spent_uzs);
    const revenue = Number(campaign.revenue_uzs);
    const impressions = campaign.impressions;
    const clicks = campaign.clicks;
    const conversions = campaign.conversions;

    // CTR = clicks / impressions * 100
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    // CPC = spent / clicks
    const cpc = clicks > 0 ? spent / clicks : 0;

    // ROAS = revenue / spent
    const roas = spent > 0 ? revenue / spent : 0;

    // ROI = (revenue - spent) / spent * 100
    const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;

    // CPA = spent / conversions
    const cpa = conversions > 0 ? spent / conversions : 0;

    return {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      platform: campaign.platform,
      status: campaign.status,
      // Raw stats
      budget_uzs: Number(campaign.budget_uzs),
      spent_uzs: spent,
      revenue_uzs: revenue,
      impressions,
      clicks,
      conversions,
      // Calculated metrics
      ctr: Math.round(ctr * 100) / 100,
      cpc: Math.round(cpc),
      roas: Math.round(roas * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      cpa: Math.round(cpa),
      // Profit
      profit_uzs: revenue - spent,
    };
  }

  /** Delete a campaign */
  async deleteCampaign(accountId: string, campaignId: string) {
    const campaign = await this.prisma.adCampaign.findFirst({
      where: { id: campaignId, account_id: accountId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    await this.prisma.adCampaign.delete({
      where: { id: campaignId },
    });

    return { message: 'Campaign deleted' };
  }
}
