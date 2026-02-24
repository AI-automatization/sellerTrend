import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const importQueue = new Queue('import-batch', redisConnection);
