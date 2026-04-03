import { Module } from '@nestjs/common';
import { ShopsController, ShopsSearchController } from './shops.controller';
import { ShopsService } from './shops.service';
import { UzumModule } from '../uzum/uzum.module';

@Module({
  imports: [UzumModule],
  // ShopsSearchController MUST come first so /shops/search registers before /shops/:shopId
  controllers: [ShopsSearchController, ShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
