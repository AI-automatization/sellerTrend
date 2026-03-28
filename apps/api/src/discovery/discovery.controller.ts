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
import { PlanGuard } from '../billing/plan.guard';
import { RequiresPlan } from '../billing/requires-plan.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityAction } from '../common/decorators/activity-action.decorator';
import { DiscoveryService } from './discovery.service';
import { NicheService } from './niche.service';
import { RequestLoggerService } from '../common/request-logger.service';
import { UzumClient } from '../uzum/uzum.client';
import { StartRunDto } from './dto/start-run.dto';

@ApiTags('discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard, PlanGuard)
@RequiresPlan('PRO')
@Controller('discovery')
export class DiscoveryController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly nicheService: NicheService,
    private readonly uzumClient: UzumClient,
    private readonly reqLogger: RequestLoggerService,
  ) {}

  @Get('categories/search')
  async searchCategories(@Query('q') q: string) {
    if (!q?.trim()) return [];
    return this.uzumClient.searchCategories(q.trim());
  }

  @Post('run')
  @ActivityAction('DISCOVERY_RUN')
  async startRun(
    @CurrentUser('account_id') accountId: string,
    @Body() body: StartRunDto,
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
    const parsed = categoryId ? parseInt(categoryId, 10) : undefined;
    if (parsed !== undefined && isNaN(parsed)) {
      throw new BadRequestException('category_id must be a valid number');
    }
    return this.discoveryService.getLeaderboard(accountId, parsed);
  }

  // ============================================================
  // Feature 04 — Niche Finder
  // ============================================================

  @Get('niches')
  getNiches(
    @CurrentUser('account_id') accountId: string,
    @Query('category_id') categoryId?: string,
  ) {
    const parsed = categoryId ? parseInt(categoryId, 10) : undefined;
    if (parsed !== undefined && isNaN(parsed)) {
      throw new BadRequestException('category_id must be a valid number');
    }
    return this.nicheService.findNiches(accountId, parsed);
  }

  @Get('niches/gaps')
  getNicheGaps(
    @CurrentUser('account_id') accountId: string,
    @Query('category_id') categoryId?: string,
  ) {
    const parsed = categoryId ? parseInt(categoryId, 10) : undefined;
    if (parsed !== undefined && isNaN(parsed)) {
      throw new BadRequestException('category_id must be a valid number');
    }
    return this.nicheService.findGaps(accountId, parsed);
  }

  // ============================================================
  // Feature 02 — Seasonal Trend Calendar
  // ============================================================

  @Get('seasonal-calendar')
  getSeasonalCalendar(
    @Query('limit') limitParam?: string,
  ) {
    const limit = limitParam ? parseInt(limitParam, 10) || undefined : undefined;
    return this.discoveryService.getSeasonalCalendar(limit);
  }

  @Get('seasonal-calendar/upcoming')
  getUpcomingSeasons() {
    return this.discoveryService.getUpcomingSeasons();
  }
}
