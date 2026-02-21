import { Module } from '@nestjs/common';
import { UzumClient } from './uzum.client';
import { UzumService } from './uzum.service';
import { UzumController } from './uzum.controller';

@Module({
  providers: [UzumClient, UzumService],
  controllers: [UzumController],
  exports: [UzumClient, UzumService],
})
export class UzumModule {}
