import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AchievementsService } from './achievements.service';

@ApiTags('achievements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  /** Get all achievements with earned/unearned status for the current user */
  @Get()
  getAchievements(@CurrentUser() user: { id: string }) {
    return this.achievementsService.getAllWithStatus(user.id);
  }

  /** Get only earned achievements for the current user */
  @Get('earned')
  getEarnedAchievements(@CurrentUser() user: { id: string }) {
    return this.achievementsService.getUserAchievements(user.id);
  }
}
