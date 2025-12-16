import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis();

export const orderQueue = new Queue('order-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});
