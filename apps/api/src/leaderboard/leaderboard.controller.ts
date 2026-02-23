import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
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
