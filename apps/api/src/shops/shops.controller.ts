import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { ShopsService } from './shops.service';

@ApiTags('shops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get(':shopId')
  getShopProfile(@Param('shopId') shopId: string) {
    return this.shopsService.getShopProfile(BigInt(shopId));
  }

  @Get(':shopId/products')
  getShopProducts(@Param('shopId') shopId: string) {
    return this.shopsService.getShopProducts(BigInt(shopId));
  }
}
