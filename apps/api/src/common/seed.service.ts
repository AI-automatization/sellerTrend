import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

/**
 * T-262 + T-263: Auto-seed on API startup.
 * All operations use upsert — safe to run repeatedly.
 * Only seeds critical config data (admin, platforms, cargo, seasonal trends).
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await this.seed();
    } catch (err) {
      this.logger.error('Seed failed (non-fatal):', err);
    }
  }

  private async seed() {
    // 1. System settings
    await this.prisma.systemSetting.upsert({
      where: { key: 'daily_fee_default' },
      update: {},
      create: { key: 'daily_fee_default', value: '50000' },
    });

    // 2. Super Admin
    const adminAccount = await this.prisma.account.upsert({
      where: { id: 'aaaaaaaa-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: 'aaaaaaaa-0000-0000-0000-000000000001',
        name: 'Super Admin',
        status: 'ACTIVE',
        balance: BigInt(0),
      },
    });

    const adminHash = await bcrypt.hash('Admin123!', 12);
    await this.prisma.user.upsert({
      where: { email: 'admin@ventra.uz' },
      update: {},
      create: {
        account_id: adminAccount.id,
        email: 'admin@ventra.uz',
        password_hash: adminHash,
        role: 'SUPER_ADMIN',
      },
    });

    // 3. Demo user
    const demoAccount = await this.prisma.account.upsert({
      where: { id: 'bbbbbbbb-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: 'bbbbbbbb-0000-0000-0000-000000000002',
        name: 'Demo Sotuvchi',
        status: 'ACTIVE',
        balance: BigInt(500_000),
      },
    });

    const demoHash = await bcrypt.hash('Demo123!', 12);
    await this.prisma.user.upsert({
      where: { email: 'demo@ventra.uz' },
      update: {},
      create: {
        account_id: demoAccount.id,
        email: 'demo@ventra.uz',
        password_hash: demoHash,
        role: 'USER',
      },
    });

    // 4. Cargo providers (skip if already exist)
    const cargoCount = await this.prisma.cargoProvider.count();
    if (cargoCount === 0) {
      await this.prisma.cargoProvider.createMany({
        data: [
          { name: 'Kargo Ekspres (Xitoy)', origin: 'CN', destination: 'UZ', method: 'CARGO', rate_per_kg: 5.5, delivery_days: 18 },
          { name: 'Temir Yo\'l (Xitoy)', origin: 'CN', destination: 'UZ', method: 'RAIL', rate_per_kg: 3.8, delivery_days: 15, min_weight_kg: 100 },
          { name: 'Avia (Xitoy)', origin: 'CN', destination: 'UZ', method: 'AVIA', rate_per_kg: 6.5, delivery_days: 5 },
          { name: 'Avto (Yevropa)', origin: 'EU', destination: 'UZ', method: 'AUTO', rate_per_kg: 3.5, delivery_days: 14 },
          { name: 'Avia (Yevropa)', origin: 'EU', destination: 'UZ', method: 'AVIA', rate_per_kg: 8.0, delivery_days: 3 },
          { name: 'Turkiya orqali (Yevropa)', origin: 'EU', destination: 'UZ', method: 'TURKEY', rate_per_kg: 4.0, delivery_days: 10 },
        ],
      });
    }

    // 5. External platforms (skip if already exist)
    const platformCount = await this.prisma.externalPlatform.count();
    if (platformCount === 0) {
      await this.prisma.externalPlatform.createMany({
        data: [
          { code: '1688', name: '1688.com', country: 'CN', base_url: 'https://www.1688.com', api_type: 'serpapi' },
          { code: 'taobao', name: 'Taobao', country: 'CN', base_url: 'https://www.taobao.com', api_type: 'serpapi' },
          { code: 'aliexpress', name: 'AliExpress', country: 'CN', base_url: 'https://www.aliexpress.com', api_type: 'affiliate' },
          { code: 'alibaba', name: 'Alibaba', country: 'CN', base_url: 'https://www.alibaba.com', api_type: 'serpapi' },
          { code: 'amazon_de', name: 'Amazon.de', country: 'DE', base_url: 'https://www.amazon.de', api_type: 'serpapi' },
          { code: 'banggood', name: 'Banggood', country: 'CN', base_url: 'https://www.banggood.com', api_type: 'playwright' },
          { code: 'shopee', name: 'Shopee', country: 'CN', base_url: 'https://shopee.com', api_type: 'playwright' },
        ],
      });
    }

    // 6. Seasonal trends (skip if already exist)
    const trendCount = await this.prisma.seasonalTrend.count();
    if (trendCount === 0) {
      await this.prisma.seasonalTrend.createMany({
        data: [
          { season_name: 'Yangi Yil', season_start: 12, season_end: 1, avg_score_boost: 1.35, peak_week: 52 },
          { season_name: '8-Mart', season_start: 2, season_end: 3, avg_score_boost: 1.20, peak_week: 9 },
          { season_name: 'Navro\'z', season_start: 3, season_end: 3, avg_score_boost: 1.15, peak_week: 12 },
          { season_name: 'Ramazon', season_start: 3, season_end: 4, avg_score_boost: 1.25, peak_week: 14 },
          { season_name: 'Maktab mavsumi', season_start: 8, season_end: 9, avg_score_boost: 1.30, peak_week: 35 },
          { season_name: 'Qurbon Hayit', season_start: 6, season_end: 6, avg_score_boost: 1.10, peak_week: 24 },
          { season_name: 'Yoz mavsumi', season_start: 6, season_end: 8, avg_score_boost: 1.10, peak_week: 28 },
          { season_name: 'Black Friday', season_start: 11, season_end: 11, avg_score_boost: 1.40, peak_week: 47 },
          { season_name: '11.11 Mega Sale', season_start: 11, season_end: 11, avg_score_boost: 1.35, peak_week: 45 },
          { season_name: 'Valentinlar kuni', season_start: 2, season_end: 2, avg_score_boost: 1.15, peak_week: 6 },
          { season_name: 'Mustaqillik kuni', season_start: 9, season_end: 9, avg_score_boost: 1.05, peak_week: 36 },
        ],
      });
    }

    this.logger.log('Auto-seed complete (admin + platforms + cargo + trends)');
  }
}
