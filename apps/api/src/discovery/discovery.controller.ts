import {
  Controller,
  Post,
  Get,
  Delete,
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

/**
 * Convert a category title (Russian/Uzbek) to a URL-compatible slug.
 * e.g. "Смартфоны Android" → "smartfony-android"
 * Used to construct proper Uzum category URLs (subcategories need slug, not just c--ID).
 */
function titleToSlug(title: string): string {
  const map: Record<string, string> = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',
    и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',
    с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',
    ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
    // Uzbek-specific
    ğ:'g',ş:'sh',ı:'i',ö:'o',ü:'u',
  };
  return title.toLowerCase()
    .split('')
    .map((c) => map[c] ?? (c.match(/[a-z0-9]/) ? c : '-'))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

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

    const rawInput = body.input.trim();
    const categoryId = await this.uzumClient.resolveCategoryId(rawInput);

    // fromSearch + categoryName → text search mode (categoryId shart emas)
    const isTextSearch = body.fromSearch && body.categoryName && !categoryId;

    if (!categoryId && !isTextSearch) {
      const isSlugOnly = rawInput.startsWith('http') &&
        /\/category\/[^/?#]+$/.test(rawInput) &&
        !/--\d+/.test(rawInput);
      throw new BadRequestException(
        isSlugOnly
          ? "URL'dan kategoriya ID aniqlanmadi. URL'ni brauzerdan to'g'ridan-to'g'ri ko'chiring — ID avtomatik bo'lishi kerak (masalan: smartfony--879). Yoki faqat raqam kiriting (masalan: 10012)."
          : "Kategoriya ID topilmadi. To'liq Uzum category URL yoki raqam kiriting.",
      );
    }

    const resolvedCategoryId = categoryId ?? 0;
    this.reqLogger.logDiscovery(accountId, resolvedCategoryId, rawInput);

    const slug = body.categoryName ? titleToSlug(body.categoryName) : '';
    const categoryUrl = rawInput.startsWith('http')
      ? rawInput
      : slug && resolvedCategoryId
        ? `https://uzum.uz/ru/category/${slug}--${resolvedCategoryId}`
        : resolvedCategoryId
          ? `https://uzum.uz/ru/category/c--${resolvedCategoryId}`
          : `https://uzum.uz/ru/search?query=${encodeURIComponent(body.categoryName ?? rawInput)}`;

    const fromSearch = body.fromSearch ?? !rawInput.startsWith('http');

    const runId = await this.discoveryService.startRun(accountId, resolvedCategoryId, categoryUrl, body.categoryName, fromSearch);
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

  @Delete('runs/:id')
  deleteRun(
    @Param('id') runId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.discoveryService.deleteRun(runId, accountId);
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

  // ============================================================
  // T-492 — Kategoriya Intelligence Dashboard
  // ============================================================

  @Get('categories/intelligence')
  getCategoryIntelligence(
    @Query('limit') limitParam?: string,
  ) {
    const limit = limitParam ? parseInt(limitParam, 10) || 50 : 50;
    return this.discoveryService.getCategoryIntelligence(limit);
  }
}
