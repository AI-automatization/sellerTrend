import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Queue } from 'bullmq';
import { redisConnection } from './src/redis';
import { prisma } from './src/prisma';

async function main() {
  const account = await prisma.account.findFirst({ select: { id: true } });
  if (!account) { console.error('❌ No accounts'); process.exit(1); }

  const job = await prisma.externalSearchJob.create({
    data: { account_id: account.id, product_id: BigInt(575137), query: 'Шампунь Syoss 440 ml', status: 'PENDING' },
  });

  const queue = new Queue('sourcing-search', redisConnection);
  const bj = await queue.add('sourcing-full', {
    query: 'Шампунь Syoss 440 ml',
    jobId: job.id,
    productId: 575137,
    productTitle: 'Шампунь Syoss 440 ml',
    accountId: account.id,
  }, { removeOnComplete: false, removeOnFail: false });

  console.log(`✅ BullMQ: ${bj.id} | DB: ${job.id}`);
  await queue.close();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
