import { FastifyInstance, FastifyRequest } from 'fastify';
import { subscribe, unsubscribe } from '../services/orderEvents';
import { logger } from '../utils/logger';

interface QueryParams {
  orderId?: string;
}

export async function orderSocket(server: FastifyInstance): Promise<void> {
  server.get(
    '/api/orders/ws',
    { websocket: true },
    (socket, request: FastifyRequest) => {
      const { orderId } = request.query as QueryParams;

      if (!orderId) {
        logger.warn('WebSocket connection attempt without orderId');
        socket.close();
        return;
      }

      logger.info({ orderId }, 'WebSocket client connected');

      // Subscribe client to order updates
      subscribe(orderId, socket);

      // Send initial message
      socket.send(
        JSON.stringify({
          orderId,
          status: 'connected',
          timestamp: new Date().toISOString(),
          metadata: {
            message: 'WebSocket connected successfully',
          },
        })
      );

      // Keep-alive ping
      const pingInterval = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          socket.ping();
        }
      }, 30000); // Ping every 30 seconds

      // Cleanup on disconnect
      socket.on('close', () => {
        logger.info({ orderId }, 'WebSocket client disconnected');
        clearInterval(pingInterval);
        unsubscribe(orderId, socket);
      });

      socket.on('error', (err: Error) => {
        logger.error({ orderId, err }, 'WebSocket error');
      });
    }
  );
}

