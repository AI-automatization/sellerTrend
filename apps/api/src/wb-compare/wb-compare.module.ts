import { Module } from '@nestjs/common';
import { WbCompareService } from './wb-compare.service';
import { WbCompareController } from './wb-compare.controller';

@Module({
  providers: [WbCompareService],
  controllers: [WbCompareController],
  exports: [WbCompareService],
})
export class WbCompareModule {}
