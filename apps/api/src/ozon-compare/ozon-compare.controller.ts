import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { OzonCompareService } from './ozon-compare.service';

@ApiTags('ozon-compare')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('ozon-compare')
export class OzonCompareController {
  constructor(private readonly ozonCompareService: OzonCompareService) {}

  @Get('search')
  @ApiOperation({ summary: "Sarlavha bo'yicha Ozon dan o'xshash mahsulotlar" })
  @ApiQuery({ name: 'title', required: true, description: 'Qidiruv matni' })
  searchByTitle(@Query('title') title: string) {
    return this.ozonCompareService.searchByTitle(title);
  }

  @Get(':productId')
  @ApiOperation({ summary: "Product nomi bo'yicha Ozon dan o'xshash mahsulotlar" })
  compare(
    @CurrentUser('account_id') accountId: string,
    @Param('productId', ParseBigIntPipe) productId: bigint,
  ) {
    return this.ozonCompareService.compareByProductId(productId, accountId);
  }
}
