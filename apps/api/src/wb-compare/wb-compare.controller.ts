import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { WbCompareService } from './wb-compare.service';

@ApiTags('wb-compare')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('wb-compare')
export class WbCompareController {
  constructor(private readonly wbCompareService: WbCompareService) {}

  @Get(':productId')
  @ApiOperation({ summary: 'Product rasmi bo`yicha Wildberries dan o`xshash mahsulotlar' })
  compare(
    @CurrentUser('account_id') accountId: string,
    @Param('productId', ParseBigIntPipe) productId: bigint,
  ) {
    return this.wbCompareService.compareByProductId(productId, accountId);
  }
}
