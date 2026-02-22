import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('balance')
  getBalance(@CurrentUser('account_id') accountId: string) {
    return this.billingService.getAccountBalance(accountId);
  }

  // Admin only: manually trigger daily charge (for testing)
  @Post('trigger-daily-charge')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  async triggerDailyCharge() {
    const result = await this.billingService.chargeAllActiveAccounts();
    return result;
  }
}
