import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReferralService } from './referral.service';

@ApiTags('referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post('generate-code')
  generateCode(@CurrentUser('account_id') accountId: string) {
    return this.referralService.generateCode(accountId);
  }

  @Get('stats')
  getStats(@CurrentUser('account_id') accountId: string) {
    return this.referralService.getStats(accountId);
  }
}
