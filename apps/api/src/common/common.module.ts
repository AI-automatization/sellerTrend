import { Global, Module } from '@nestjs/common';
import { RequestLoggerService } from './request-logger.service';
import { SeedService } from './seed.service';
import { QueueLifecycleService } from './queue-lifecycle.service';

@Global()
@Module({
  providers: [RequestLoggerService, SeedService, QueueLifecycleService],
  exports: [RequestLoggerService],
})
export class CommonModule {}
