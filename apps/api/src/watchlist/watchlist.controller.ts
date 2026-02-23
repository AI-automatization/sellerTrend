import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WatchlistService } from './watchlist.service';

@ApiTags('watchlists')
@ApiBearerAuth()
@Controller('watchlists')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  /** Create a new watchlist */
  @Post()
  @UseGuards(JwtAuthGuard, BillingGuard)
  createWatchlist(
    @CurrentUser('account_id') accountId: string,
    @Body() body: { name: string; description?: string; product_ids: string[] },
  ) {
    return this.watchlistService.createWatchlist(accountId, body);
  }

  /** List my watchlists */
  @Get()
  @UseGuards(JwtAuthGuard, BillingGuard)
  listWatchlists(@CurrentUser('account_id') accountId: string) {
    return this.watchlistService.listWatchlists(accountId);
  }

  /** Share a watchlist (generate public link) */
  @Post(':id/share')
  @UseGuards(JwtAuthGuard, BillingGuard)
  shareWatchlist(
    @CurrentUser('account_id') accountId: string,
    @Param('id') watchlistId: string,
  ) {
    return this.watchlistService.shareWatchlist(accountId, watchlistId);
  }

  /** Get shared watchlist by token — NO auth guard */
  @Get('shared/:token')
  getSharedWatchlist(@Param('token') token: string) {
    return this.watchlistService.getSharedWatchlist(token);
  }

  /** Delete a watchlist */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, BillingGuard)
  deleteWatchlist(
    @CurrentUser('account_id') accountId: string,
    @Param('id') watchlistId: string,
  ) {
    return this.watchlistService.deleteWatchlist(accountId, watchlistId);
  }
}
