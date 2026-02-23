import { Module } from '@nestjs/common';
import { SourcingService } from './sourcing.service';
import { SourcingController } from './sourcing.controller';

@Module({
  providers: [SourcingService],
  controllers: [SourcingController],
})
export class SourcingModule {}
