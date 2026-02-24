import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL    = 'admin@uzum-trend.uz';
const ADMIN_PASSWORD = 'Admin123!';

async function main() {
  console.log('🌱 Seeding database...\n');

  // 1. Default system settings
  await prisma.systemSetting.upsert({
    where:  { key: 'daily_fee_default' },
    update: {},
    create: { key: 'daily_fee_default', value: '50000' },
  });
  console.log('✅ system_settings: daily_fee_default = 50,000 so\'m');

  // 2. Super admin account
  const adminAccount = await prisma.account.upsert({
    where:  { id: 'aaaaaaaa-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id:      'aaaaaaaa-0000-0000-0000-000000000001',
      name:    'Super Admin',
      status:  'ACTIVE',
      balance: BigInt(0),
    },
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where:  { email: ADMIN_EMAIL },
    update: {},
    create: {
      account_id:    adminAccount.id,
      email:         ADMIN_EMAIL,
      password_hash: passwordHash,
      role:          'SUPER_ADMIN',
    },
  });
  console.log('✅ Super Admin yaratildi:');
  console.log(`   📧 Email:  ${ADMIN_EMAIL}`);
  console.log(`   🔑 Parol:  ${ADMIN_PASSWORD}`);

  // 3. Demo user (test uchun)
  const demoAccount = await prisma.account.upsert({
    where:  { id: 'bbbbbbbb-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id:      'bbbbbbbb-0000-0000-0000-000000000002',
      name:    'Demo Sotuvchi',
      status:  'ACTIVE',
      balance: BigInt(500_000),
    },
  });

  const demoHash = await bcrypt.hash('Demo123!', 12);
  await prisma.user.upsert({
    where:  { email: 'demo@uzum-trend.uz' },
    update: {},
    create: {
      account_id:    demoAccount.id,
      email:         'demo@uzum-trend.uz',
      password_hash: demoHash,
      role:          'USER',
    },
  });
  console.log('\n✅ Demo User yaratildi:');
  console.log('   📧 Email:  demo@uzum-trend.uz');
  console.log('   🔑 Parol:  Demo123!');
  console.log('   💰 Balans: 500,000 so\'m');


  // ─── 10 Test Users across 5 Companies ───
  const pw = await bcrypt.hash('Test123!', 12);

  const companies = [
    { id: 'cccccccc-0000-0000-0000-000000000003', name: 'Toshkent Electronics', balance: 2_500_000 },
    { id: 'dddddddd-0000-0000-0000-000000000004', name: 'Samarkand Fashion', balance: 1_800_000 },
    { id: 'eeeeeeee-0000-0000-0000-000000000005', name: 'Buxoro Cosmetics', balance: 3_200_000 },
    { id: 'ffffffff-0000-0000-0000-000000000006', name: 'Andijon Foods', balance: 900_000 },
    { id: '11111111-0000-0000-0000-000000000007', name: 'Namangan Tech Hub', balance: 4_100_000 },
  ];

  for (const c of companies) {
    await prisma.account.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, name: c.name, status: 'ACTIVE', balance: BigInt(c.balance) },
    });
  }

  const testUsers = [
    { email: 'aziz@toshkent-electronics.uz', account_id: companies[0].id, role: 'ADMIN' },
    { email: 'malika@toshkent-electronics.uz', account_id: companies[0].id, role: 'USER' },
    { email: 'jasur@samarkand-fashion.uz', account_id: companies[1].id, role: 'ADMIN' },
    { email: 'nilufar@samarkand-fashion.uz', account_id: companies[1].id, role: 'MODERATOR' },
    { email: 'sherzod@buxoro-cosmetics.uz', account_id: companies[2].id, role: 'ADMIN' },
    { email: 'gulnora@buxoro-cosmetics.uz', account_id: companies[2].id, role: 'USER' },
    { email: 'bobur@andijon-foods.uz', account_id: companies[3].id, role: 'ADMIN' },
    { email: 'dilshod@andijon-foods.uz', account_id: companies[3].id, role: 'USER' },
    { email: 'sardor@namangan-tech.uz', account_id: companies[4].id, role: 'ADMIN' },
    { email: 'kamola@namangan-tech.uz', account_id: companies[4].id, role: 'USER' },
  ];

  for (const u of testUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        account_id: u.account_id,
        email: u.email,
        password_hash: pw,
        role: u.role as any,
      },
    });
  }
  console.log('\n✅ 10 test userlar yaratildi (Test123! parol)');

  // ─── Test deposit transactions ───
  for (const c of companies) {
    const depositsForCompany = [
      { amount: Math.floor(c.balance * 0.6), description: 'Birinchi to\'lov' },
      { amount: Math.floor(c.balance * 0.4), description: 'Ikkinchi to\'lov' },
    ];
    let currentBal = BigInt(0);
    for (const d of depositsForCompany) {
      const bigAmount = BigInt(d.amount);
      const newBal = currentBal + bigAmount;
      await prisma.transaction.create({
        data: {
          account_id: c.id,
          type: 'DEPOSIT',
          amount: bigAmount,
          balance_before: currentBal,
          balance_after: newBal,
          description: d.description,
        },
      });
      currentBal = newBal;
    }
  }
  console.log('✅ Test deposit tranzaksiyalar yaratildi');

  // 4. Cargo providers
  const existing = await prisma.cargoProvider.count();
  if (existing === 0) {
    await prisma.cargoProvider.createMany({
      data: [
        // Xitoy → Toshkent
        { name: 'Kargo Ekspres (Xitoy)', origin: 'CN', destination: 'UZ', method: 'CARGO', rate_per_kg: 5.5, delivery_days: 18 },
        { name: 'Temir Yo\'l (Xitoy)',   origin: 'CN', destination: 'UZ', method: 'RAIL',  rate_per_kg: 3.8, delivery_days: 15, min_weight_kg: 100 },
        { name: 'Avia (Xitoy)',          origin: 'CN', destination: 'UZ', method: 'AVIA',  rate_per_kg: 6.5, delivery_days: 5 },
        // Yevropa → Toshkent
        { name: 'Avto (Yevropa)',            origin: 'EU', destination: 'UZ', method: 'AUTO',   rate_per_kg: 3.5, delivery_days: 14 },
        { name: 'Avia (Yevropa)',            origin: 'EU', destination: 'UZ', method: 'AVIA',   rate_per_kg: 8.0, delivery_days: 3 },
        { name: 'Turkiya orqali (Yevropa)', origin: 'EU', destination: 'UZ', method: 'TURKEY', rate_per_kg: 4.0, delivery_days: 10 },
      ],
    });
    console.log('\n✅ Cargo provayderlar yaratildi (6 ta)');
  } else {
    console.log('\n✅ Cargo provayderlar allaqachon mavjud');
  }

  // 5. External platforms
  const platformCount = await prisma.externalPlatform.count();
  if (platformCount === 0) {
    await prisma.externalPlatform.createMany({
      data: [
        { code: '1688',        name: '1688.com',        country: 'CN', base_url: 'https://www.1688.com',       api_type: 'serpapi' },
        { code: 'taobao',      name: 'Taobao',          country: 'CN', base_url: 'https://www.taobao.com',     api_type: 'serpapi' },
        { code: 'aliexpress',  name: 'AliExpress',      country: 'CN', base_url: 'https://www.aliexpress.com', api_type: 'affiliate' },
        { code: 'alibaba',     name: 'Alibaba',         country: 'CN', base_url: 'https://www.alibaba.com',    api_type: 'serpapi' },
        { code: 'amazon_de',   name: 'Amazon.de',       country: 'DE', base_url: 'https://www.amazon.de',      api_type: 'serpapi' },
        { code: 'banggood',    name: 'Banggood',        country: 'CN', base_url: 'https://www.banggood.com',   api_type: 'playwright' },
        { code: 'shopee',      name: 'Shopee',          country: 'CN', base_url: 'https://shopee.com',         api_type: 'playwright' },
      ],
    });
    console.log('\n✅ External platformalar yaratildi (7 ta)');
  } else {
    console.log('\n✅ External platformalar allaqachon mavjud');
  }

  // 6. Seasonal trends (O'zbekiston uchun)
  const trendCount = await prisma.seasonalTrend.count();
  if (trendCount === 0) {
    await prisma.seasonalTrend.createMany({
      data: [
        { season_name: 'Yangi Yil',           season_start: 12, season_end: 1,  avg_score_boost: 1.35, peak_week: 52 },
        { season_name: '8-Mart',              season_start: 2,  season_end: 3,  avg_score_boost: 1.20, peak_week: 9 },
        { season_name: 'Navro\'z',            season_start: 3,  season_end: 3,  avg_score_boost: 1.15, peak_week: 12 },
        { season_name: 'Ramazon',             season_start: 3,  season_end: 4,  avg_score_boost: 1.25, peak_week: 14 },
        { season_name: 'Maktab mavsumi',      season_start: 8,  season_end: 9,  avg_score_boost: 1.30, peak_week: 35 },
        { season_name: 'Qurbon Hayit',        season_start: 6,  season_end: 6,  avg_score_boost: 1.10, peak_week: 24 },
        { season_name: 'Yoz mavsumi',         season_start: 6,  season_end: 8,  avg_score_boost: 1.10, peak_week: 28 },
        { season_name: 'Black Friday',        season_start: 11, season_end: 11, avg_score_boost: 1.40, peak_week: 47 },
        { season_name: '11.11 Mega Sale',     season_start: 11, season_end: 11, avg_score_boost: 1.35, peak_week: 45 },
        { season_name: 'Valentinlar kuni',    season_start: 2,  season_end: 2,  avg_score_boost: 1.15, peak_week: 6 },
        { season_name: 'Mustaqillik kuni',    season_start: 9,  season_end: 9,  avg_score_boost: 1.05, peak_week: 36 },
      ],
    });
    console.log('\n✅ Seasonal trends yaratildi (11 ta)');
  } else {
    console.log('\n✅ Seasonal trends allaqachon mavjud');
  }

  console.log('\n🎉 Seed yakunlandi!');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
