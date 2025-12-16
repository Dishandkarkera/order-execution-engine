import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { orderQueue } from '../queues/order.queue';
import { Order, OrderRequest, OrderResponse } from '../types/order.types';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export async function orderRoutes(server: FastifyInstance): Promise<void> {
  // Order execution endpoint
  server.post<{ Body: OrderRequest }>(
    '/api/orders/execute',
    async (request: FastifyRequest<{ Body: OrderRequest }>, reply: FastifyReply): Promise<OrderResponse> => {
      const { tokenIn, tokenOut, amountIn, slippage } = request.body;

      // Validation
      if (!tokenIn || !tokenOut || !amountIn) {
        logger.warn({ tokenIn, tokenOut, amountIn }, 'Invalid order request');
        reply.code(400);
        throw new Error('Missing required fields: tokenIn, tokenOut, amountIn');
      }

      if (typeof amountIn !== 'number' || amountIn <= 0) {
        logger.warn({ amountIn }, 'Invalid amountIn value');
        reply.code(400);
        throw new Error('amountIn must be a positive number');
      }

      if (slippage !== undefined && (typeof slippage !== 'number' || slippage < 0 || slippage > 1)) {
        logger.warn({ slippage }, 'Invalid slippage value');
        reply.code(400);
        throw new Error('slippage must be a number between 0 and 1');
      }

      const order: Order = {
        id: uuidv4(),
        tokenIn,
        tokenOut,
        amountIn,
        slippage: slippage ?? 0.005, // Default 0.5%
        status: 'pending',
        createdAt: new Date(),
      };

      // Add order to queue for asynchronous processing
      await orderQueue.add('execute-order', order, {
        jobId: order.id,
      });

      logger.info(
        {
          orderId: order.id,
          tokenIn: order.tokenIn,
          tokenOut: order.tokenOut,
          amountIn: order.amountIn,
        },
        'Order queued for execution'
      );

      const response: OrderResponse = {
        orderId: order.id,
        status: order.status,
        wsUrl: `ws://localhost:${config.port}/api/orders/ws?orderId=${order.id}`,
      };

      return response;
    }
  );
}

