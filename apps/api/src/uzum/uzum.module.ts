import { Module, forwardRef } from '@nestjs/common';
import { UzumClient } from './uzum.client';
import { UzumService } from './uzum.service';
import { UzumController } from './uzum.controller';
import { AiModule } from '../ai/ai.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [AiModule, forwardRef(() => ProductsModule)],
  providers: [UzumClient, UzumService],
  controllers: [UzumController],
  exports: [UzumClient, UzumService],
})
export class UzumModule {}
