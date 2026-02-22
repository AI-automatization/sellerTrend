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

  console.log('\n🎉 Seed yakunlandi!');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
