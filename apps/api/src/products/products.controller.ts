import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('tracked')
  getTracked(@CurrentUser('account_id') accountId: string) {
    return this.productsService.getTrackedProducts(accountId);
  }

  @Post(':id/track')
  track(
    @CurrentUser('account_id') accountId: string,
    @Param('id') productId: string,
  ) {
    return this.productsService.trackProduct(accountId, BigInt(productId));
  }

  @Get(':id/snapshots')
  snapshots(@Param('id') productId: string) {
    return this.productsService.getProductSnapshots(BigInt(productId));
  }
}
