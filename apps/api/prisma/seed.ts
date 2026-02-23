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
      balance: BigInt(999_999_999),
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

  console.log('\n🎉 Seed yakunlandi!');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
