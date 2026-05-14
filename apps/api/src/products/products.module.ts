import { Module, forwardRef } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductSearchService } from './product-search.service';
import { ProductAnalyticsService } from './product-analytics.service';
import { ProductTrendService } from './product-trend.service';
import { ProductsController } from './products.controller';
import { AiModule } from '../ai/ai.module';
import { UzumModule } from '../uzum/uzum.module';
import { BrightDataModule } from '../bright-data/bright-data.module';

@Module({
  imports: [AiModule, forwardRef(() => UzumModule), BrightDataModule],
  providers: [ProductsService, ProductSearchService, ProductAnalyticsService, ProductTrendService],
  controllers: [ProductsController],
  exports: [ProductsService, ProductSearchService, ProductAnalyticsService, ProductTrendService],
})
export class ProductsModule {}
