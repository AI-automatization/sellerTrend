import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    }),
  ],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
