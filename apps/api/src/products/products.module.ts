import { Module, forwardRef } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AiModule } from '../ai/ai.module';
import { UzumModule } from '../uzum/uzum.module';

@Module({
  imports: [AiModule, forwardRef(() => UzumModule)],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
