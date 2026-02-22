import { Global, Module } from '@nestjs/common';
import { RequestLoggerService } from './request-logger.service';

@Global()
@Module({
  providers: [RequestLoggerService],
  exports: [RequestLoggerService],
})
export class CommonModule {}
