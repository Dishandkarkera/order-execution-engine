import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { orderQueue } from '../queue/orderQueue';
import { Order } from '../models/order';

export async function orderRoutes(server: FastifyInstance) {
  server.post('/api/orders/execute', async (request, reply) => {
    const { tokenIn, tokenOut, amountIn, slippage } = request.body as any;

    if (!tokenIn || !tokenOut || !amountIn) {
      return reply.code(400).send({ error: 'Invalid request payload' });
    }

    const order: Order = {
      id: uuidv4(),
      tokenIn,
      tokenOut,
      amountIn,
      slippage: slippage ?? 0.01,
      status: 'pending',
      createdAt: new Date()
    };

    await orderQueue.add('execute-order', order);

    return {
      orderId: order.id,
      status: order.status,
      wsUrl: `ws://localhost:3000/api/orders/ws?orderId=${order.id}`
    };
  });
}
