import { Controller, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { ShopsService } from './shops.service';

/**
 * Search controller must be registered BEFORE ShopsController in the module
 * to ensure /shops/search route takes priority over /shops/:shopId in Express router.
 */
@ApiTags('shops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('shops')
export class ShopsSearchController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get('search')
  searchShops(@Query('q') q?: string) {
    if (!q || q.trim().length < 2) throw new BadRequestException('Kamida 2 ta harf kiriting');
    return this.shopsService.searchByName(q.trim());
  }
}

@ApiTags('shops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get(':shopId')
  getShopProfile(@Param('shopId', ParseBigIntPipe) shopId: bigint) {
    return this.shopsService.getShopProfile(shopId);
  }

  @Get(':shopId/products')
  getShopProducts(
    @Param('shopId', ParseBigIntPipe) shopId: bigint,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shopsService.getShopProducts(
      shopId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 100,
    );
  }
}
