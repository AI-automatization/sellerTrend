import { Module } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { NicheService } from './niche.service';
import { DiscoveryController } from './discovery.controller';
import { UzumModule } from '../uzum/uzum.module';

@Module({
  imports: [UzumModule],
  providers: [DiscoveryService, NicheService],
  controllers: [DiscoveryController],
})
export class DiscoveryModule {}
