import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BrightDataClient } from './bright-data.client';

@Module({
  imports: [ConfigModule],
  providers: [BrightDataClient],
  exports: [BrightDataClient],
})
export class BrightDataModule {}
