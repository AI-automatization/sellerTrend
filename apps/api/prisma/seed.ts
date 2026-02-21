import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Default system settings
  await prisma.systemSetting.upsert({
    where: { key: 'daily_fee_default' },
    update: {},
    create: { key: 'daily_fee_default', value: '50000' },
  });

  // Super admin account
  const adminAccount = await prisma.account.upsert({
    where: { id: 'super-admin-account-00000000-0000' },
    update: {},
    create: {
      id: 'super-admin-account-00000000-0000',
      name: 'Admin Account',
      status: 'ACTIVE',
      balance: BigInt(10_000_000),
    },
  });

  const passwordHash = await bcrypt.hash('admin123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@uzum-trend.uz' },
    update: {},
    create: {
      account_id: adminAccount.id,
      email: 'admin@uzum-trend.uz',
      password_hash: passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('Seed completed: system_settings + super admin');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
