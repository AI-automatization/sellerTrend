import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { UzumModule } from './uzum/uzum.module';
import { ProductsModule } from './products/products.module';
import { AdminModule } from './admin/admin.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { AiModule } from './ai/ai.module';
import { SourcingModule } from './sourcing/sourcing.module';
import { CompetitorModule } from './competitor/competitor.module';
import { CommonModule } from './common/common.module';
import { HealthController } from './common/health.controller';
// v1.0 MVP modules
import { ToolsModule } from './tools/tools.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ShopsModule } from './shops/shops.module';
import { ReferralModule } from './referral/referral.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ExportModule } from './export/export.module';
// v2.0 modules
import { ConsultationModule } from './consultation/consultation.module';
import { GatewayModule } from './common/gateways/gateway.module';
// v3.0 Signals
import { SignalsModule } from './signals/signals.module';
// v4.0 Enterprise
import { AdsModule } from './ads/ads.module';
import { TeamModule } from './team/team.module';
import { ReportsModule } from './reports/reports.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { CommunityModule } from './community/community.module';
// v5.0 Feedback & Notifications
import { FeedbackModule } from './feedback/feedback.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    CommonModule,
    PrismaModule,
    AuthModule,
    BillingModule,
    UzumModule,
    ProductsModule,
    AdminModule,
    DiscoveryModule,
    AiModule,
    SourcingModule,
    CompetitorModule,
    // v1.0 MVP
    ToolsModule,
    LeaderboardModule,
    ShopsModule,
    ReferralModule,
    ApiKeysModule,
    ExportModule,
    // v2.0
    ConsultationModule,
    GatewayModule,
    // v3.0 Signals
    SignalsModule,
    // v4.0 Enterprise
    AdsModule,
    TeamModule,
    ReportsModule,
    WatchlistModule,
    CommunityModule,
    // v5.0 Feedback & Notifications
    FeedbackModule,
    NotificationModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: CustomThrottlerGuard }],
  controllers: [HealthController],
})
export class AppModule {}
