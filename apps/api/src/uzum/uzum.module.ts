import { Module, forwardRef } from '@nestjs/common';
import { UzumAuthClient } from './uzum-auth.client';
import { UzumSearchClient } from './uzum-search.client';
import { UzumClient } from './uzum.client';
import { UzumService } from './uzum.service';
import { UzumController } from './uzum.controller';
import { AiModule } from '../ai/ai.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [AiModule, forwardRef(() => ProductsModule)],
  providers: [UzumAuthClient, UzumSearchClient, UzumClient, UzumService],
  controllers: [UzumController],
  exports: [UzumAuthClient, UzumSearchClient, UzumClient, UzumService],
})
export class UzumModule {}
