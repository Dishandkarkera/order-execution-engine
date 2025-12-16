import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const connection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
});

connection.on('connect', () => {
  logger.info('Redis connected for order queue');
});

connection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error for order queue');
});

export const orderQueue = new Queue('order-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});
