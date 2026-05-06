import { Module } from '@nestjs/common';
import { ChinaCompareService } from './china-compare.service';
import { ChinaCompareController } from './china-compare.controller';

@Module({
  providers: [ChinaCompareService],
  controllers: [ChinaCompareController],
  exports: [ChinaCompareService],
})
export class ChinaCompareModule {}
