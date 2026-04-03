import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { EmbeddingService } from './embedding.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AiService, EmbeddingService],
  controllers: [AiController],
  exports: [AiService, EmbeddingService],
})
export class AiModule {}
