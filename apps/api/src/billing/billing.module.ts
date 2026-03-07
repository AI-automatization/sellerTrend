import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingPublicController } from './billing-public.controller';

@Module({
  providers: [BillingService],
  controllers: [BillingController, BillingPublicController],
  exports: [BillingService],
})
export class BillingModule {}
