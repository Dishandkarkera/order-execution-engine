import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { emit } from '../services/orderEvents';
import { Order, OrderUpdate } from '../types/order.types';
import { selectBestDex, generateMockTxHash } from '../dex/mockDexRouter';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const connection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
});

connection.on('connect', () => {
  logger.info('Redis connected for order worker');
});

connection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error for order worker');
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function processOrder(job: Job<Order>): Promise<{ success: boolean }> {
  const order = job.data;
  
  logger.info({ orderId: order.id, tokenIn: order.tokenIn, tokenOut: order.tokenOut }, 'Processing order');

  try {
    // 1. Routing stage - Select best DEX
    const routingDelay = getRandomDelay(100, 300);
    await sleep(routingDelay);
    
    const dexOption = selectBestDex(order.tokenIn, order.tokenOut, order.amountIn);
    
    const routingUpdate: OrderUpdate = {
      orderId: order.id,
      status: 'routing',
      timestamp: new Date().toISOString(),
      metadata: {
        selectedDex: dexOption.name,
        message: `Routing to ${dexOption.name}`,
      },
    };
    emit(order.id, routingUpdate);
    logger.info({ orderId: order.id, dex: dexOption.name }, 'Order routed to DEX');

    // 2. Building transaction stage
    const buildingDelay = getRandomDelay(200, 400);
    await sleep(buildingDelay);
    
    const buildingUpdate: OrderUpdate = {
      orderId: order.id,
      status: 'building',
      timestamp: new Date().toISOString(),
      metadata: {
        message: 'Constructing transaction',
      },
    };
    emit(order.id, buildingUpdate);
    logger.info({ orderId: order.id }, 'Transaction built');

    // 3. Submitting stage
    const submittingDelay = getRandomDelay(150, 350);
    await sleep(submittingDelay);
    
    const txHash = generateMockTxHash();
    
    const submittedUpdate: OrderUpdate = {
      orderId: order.id,
      status: 'submitted',
      timestamp: new Date().toISOString(),
      metadata: {
        txHash,
        message: 'Transaction submitted to blockchain',
      },
    };
    emit(order.id, submittedUpdate);
    logger.info({ orderId: order.id, txHash }, 'Transaction submitted');

    // 4. Confirmation stage
    const confirmationDelay = getRandomDelay(300, 500);
    await sleep(confirmationDelay);
    
    const confirmedUpdate: OrderUpdate = {
      orderId: order.id,
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      metadata: {
        txHash,
        selectedDex: dexOption.name,
        message: 'Order executed successfully',
      },
    };
    emit(order.id, confirmedUpdate);
    logger.info({ orderId: order.id, txHash }, 'Order confirmed');

    return { success: true };
  } catch (error) {
    logger.error({ orderId: order.id, error }, 'Order processing failed');
    
    const failedUpdate: OrderUpdate = {
      orderId: order.id,
      status: 'failed',
      timestamp: new Date().toISOString(),
      metadata: {
        message: error instanceof Error ? error.message : 'Order execution failed',
      },
    };
    emit(order.id, failedUpdate);
    
    throw error;
  }
}

const worker = new Worker('order-queue', processOrder, {
  connection,
  concurrency: config.worker.concurrency,
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job failed');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker');
  await worker.close();
  process.exit(0);
});

logger.info('Order execution worker started');

