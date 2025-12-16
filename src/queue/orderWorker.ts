import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { emit } from '../services/orderEvents';

const connection = new IORedis({
  maxRetriesPerRequest: null
});


function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

new Worker(
  'order-queue',
  async job => {
    const order = job.data;

    // 1. Routing
    emit(order.id, { status: 'routing', message: 'Routing order to best DEX' });
    await sleep(1000);

    // 2. Building transaction
    emit(order.id, { status: 'building', message: 'Building transaction' });
    await sleep(1000);

    // 3. Submitting
    emit(order.id, { status: 'submitted', message: 'Submitting transaction' });
    await sleep(1000);

    // 4. Confirmed
    emit(order.id, {
      status: 'confirmed',
      message: 'Order executed successfully',
      txHash: '0xMOCK_TX_HASH'
    });

    return { success: true };
  },
  { connection }
);
