import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityAction } from '../common/decorators/activity-action.decorator';
import { DiscoveryService } from './discovery.service';
import { NicheService } from './niche.service';
import { RequestLoggerService } from '../common/request-logger.service';
import { UzumClient } from '../uzum/uzum.client';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('discovery')
export class DiscoveryController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly nicheService: NicheService,
    private readonly uzumClient: UzumClient,
    private readonly reqLogger: RequestLoggerService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('run')
  @ActivityAction('DISCOVERY_RUN')
  async startRun(
    @CurrentUser('account_id') accountId: string,
    @Body() body: { input: string },
  ) {
    if (!body.input?.trim()) {
      throw new BadRequestException('input maydoni kerak (URL yoki kategoriya ID)');
    }

    const categoryId = await this.uzumClient.resolveCategoryId(body.input.trim());

    if (!categoryId) {
      const isSlugOnly = body.input.trim().startsWith('http') &&
        /\/category\/[^/?#]+$/.test(body.input.trim()) &&
        !/--\d+/.test(body.input.trim());
      throw new BadRequestException(
        isSlugOnly
          ? "URL'dan kategoriya ID aniqlanmadi. URL'ni brauzerdan to'g'ridan-to'g'ri ko'chiring — ID avtomatik bo'lishi kerak (masalan: smartfony--879). Yoki faqat raqam kiriting (masalan: 10012)."
          : "Kategoriya ID topilmadi. To'liq Uzum category URL yoki raqam kiriting.",
      );
    }

    this.reqLogger.logDiscovery(accountId, categoryId, body.input.trim());

    const rawInput = body.input.trim();
    const categoryUrl = rawInput.startsWith('http')
      ? rawInput
      : `https://uzum.uz/ru/category/c--${categoryId}`;

    const runId = await this.discoveryService.startRun(accountId, categoryId, categoryUrl);
    return { run_id: runId, category_id: categoryId, message: 'Discovery run started' };
  }

  @Get('runs')
  listRuns(@CurrentUser('account_id') accountId: string) {
    return this.discoveryService.listRuns(accountId);
  }

  @Get('runs/:id')
  getRun(
    @Param('id') runId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.discoveryService.getRun(runId, accountId);
  }

  @Get('leaderboard')
  getLeaderboard(
    @CurrentUser('account_id') accountId: string,
    @Query('category_id') categoryId?: string,
  ) {
    return this.discoveryService.getLeaderboard(
      accountId,
      categoryId ? parseInt(categoryId) : undefined,
    );
  }

  // ============================================================
  // Feature 04 — Niche Finder
  // ============================================================

  @Get('niches')
  getNiches(
    @CurrentUser('account_id') accountId: string,
    @Query('category_id') categoryId?: string,
  ) {
    return this.nicheService.findNiches(
      accountId,
      categoryId ? parseInt(categoryId) : undefined,
    );
  }

  @Get('niches/gaps')
  getNicheGaps(
    @CurrentUser('account_id') accountId: string,
    @Query('category_id') categoryId?: string,
  ) {
    return this.nicheService.findGaps(
      accountId,
      categoryId ? parseInt(categoryId) : undefined,
    );
  }

  // ============================================================
  // Feature 02 — Seasonal Trend Calendar
  // ============================================================

  @Get('seasonal-calendar')
  async getSeasonalCalendar() {
    const trends = await this.prisma.seasonalTrend.findMany({
      orderBy: { season_start: 'asc' },
    });

    return {
      events: trends.map((t) => ({
        id: t.id,
        name: t.season_name,
        start_month: t.season_start,
        end_month: t.season_end,
        boost: t.avg_score_boost ? Number(t.avg_score_boost) : null,
        peak_week: t.peak_week,
        category_id: t.category_id?.toString() ?? null,
      })),
    };
  }

  @Get('seasonal-calendar/upcoming')
  async getUpcomingSeasons() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

    const trends = await this.prisma.seasonalTrend.findMany();

    const upcoming = trends.filter((t) => {
      if (t.season_start <= t.season_end) {
        // Normal range (e.g. 3-4)
        return (
          (currentMonth >= t.season_start && currentMonth <= t.season_end) ||
          (nextMonth >= t.season_start && nextMonth <= t.season_end)
        );
      }
      // Wrapping range (e.g. 12-1)
      return (
        currentMonth >= t.season_start ||
        currentMonth <= t.season_end ||
        nextMonth >= t.season_start ||
        nextMonth <= t.season_end
      );
    });

    return {
      current_month: currentMonth,
      events: upcoming.map((t) => ({
        id: t.id,
        name: t.season_name,
        start_month: t.season_start,
        end_month: t.season_end,
        boost: t.avg_score_boost ? Number(t.avg_score_boost) : null,
        peak_week: t.peak_week,
      })),
    };
  }
}
