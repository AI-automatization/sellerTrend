import { Module } from '@nestjs/common';
import { AiQuotaService } from './ai-quota.service';
import { AiContentService } from './ai-content.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { EmbeddingService } from './embedding.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AiQuotaService, AiContentService, AiService, EmbeddingService],
  controllers: [AiController],
  exports: [AiQuotaService, AiContentService, AiService, EmbeddingService],
})
export class AiModule {}
