import { Module } from '@nestjs/common';
import { OzonCompareService } from './ozon-compare.service';
import { OzonCompareController } from './ozon-compare.controller';

@Module({
  providers: [OzonCompareService],
  controllers: [OzonCompareController],
  exports: [OzonCompareService],
})
export class OzonCompareModule {}
