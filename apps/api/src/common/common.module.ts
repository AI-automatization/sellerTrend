import { Global, Module } from '@nestjs/common';
import { RequestLoggerService } from './request-logger.service';
import { SeedService } from './seed.service';

@Global()
@Module({
  providers: [RequestLoggerService, SeedService],
  exports: [RequestLoggerService],
})
export class CommonModule {}
