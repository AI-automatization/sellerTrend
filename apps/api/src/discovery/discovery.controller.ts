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
import { DiscoveryService } from './discovery.service';
import { RequestLoggerService } from '../common/request-logger.service';
import { UzumClient } from '../uzum/uzum.client';

@ApiTags('discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('discovery')
export class DiscoveryController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly uzumClient: UzumClient,
    private readonly reqLogger: RequestLoggerService,
  ) {}

  /**
   * Start a new category discovery run.
   * input: Uzum category URL (any format) or plain numeric ID.
   *
   * URL examples:
   *   https://uzum.uz/ru/category/smartfony--879       ← --ID pattern (fast)
   *   https://uzum.uz/uz/category/telefonlar           ← no ID → page scrape
   *   10012                                            ← plain number
   */
  @Post('run')
  async startRun(
    @CurrentUser('account_id') accountId: string,
    @Body() body: { input: string },
  ) {
    if (!body.input?.trim()) {
      throw new BadRequestException('input maydoni kerak (URL yoki kategoriya ID)');
    }

    const categoryId = await this.uzumClient.resolveCategoryId(body.input.trim());

    if (!categoryId) {
      throw new BadRequestException(
        "Kategoriya ID topilmadi. To'liq Uzum category URL yoki raqam kiriting.",
      );
    }

    this.reqLogger.logDiscovery(accountId, categoryId, body.input.trim());

    const runId = await this.discoveryService.startRun(accountId, categoryId);
    return { run_id: runId, category_id: categoryId, message: 'Discovery run started' };
  }

  /** List all runs for current account */
  @Get('runs')
  listRuns(@CurrentUser('account_id') accountId: string) {
    return this.discoveryService.listRuns(accountId);
  }

  /** Get single run with winners */
  @Get('runs/:id')
  getRun(
    @Param('id') runId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.discoveryService.getRun(runId, accountId);
  }

  /** Latest leaderboard (last completed run) */
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
}
