import { Module } from '@nestjs/common';
import { UzumModule } from '../uzum/uzum.module';
import { CompetitorService } from './competitor.service';
import { CompetitorController } from './competitor.controller';

@Module({
  imports: [UzumModule],
  providers: [CompetitorService],
  controllers: [CompetitorController],
})
export class CompetitorModule {}
