import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { ChinaCompareService } from './china-compare.service';

@ApiTags('china-compare')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('china-compare')
export class ChinaCompareController {
  constructor(private readonly chinaCompareService: ChinaCompareService) {}

  @Get(':productId')
  @ApiOperation({ summary: 'Product rasmi bo`yicha Alibaba dan o`xshash mahsulotlar' })
  compare(
    @CurrentUser('account_id') accountId: string,
    @Param('productId', ParseBigIntPipe) productId: bigint,
  ) {
    return this.chinaCompareService.compareByProductId(productId, accountId);
  }
}
