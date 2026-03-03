import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('public')
  getPublicLeaderboard() {
    return this.leaderboardService.getPublicLeaderboard();
  }

  @Get('public/categories')
  getPublicCategories() {
    return this.leaderboardService.getPublicCategories();
  }
}
