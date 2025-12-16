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
    (connection, request: FastifyRequest) => {
      const { orderId } = request.query as QueryParams;

      if (!orderId) {
        logger.warn('WebSocket connection attempt without orderId');
        connection.socket.close();
        return;
      }

      logger.info({ orderId }, 'WebSocket client connected');

      // Subscribe client to order updates
      subscribe(orderId, connection.socket);

      // Send initial message
      connection.socket.send(
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
        if (connection.socket.readyState === connection.socket.OPEN) {
          connection.socket.ping();
        }
      }, 30000); // Ping every 30 seconds

      // Cleanup on disconnect
      connection.socket.on('close', () => {
        logger.info({ orderId }, 'WebSocket client disconnected');
        clearInterval(pingInterval);
        unsubscribe(orderId, connection.socket);
      });

      connection.socket.on('error', (err: Error) => {
        logger.error({ orderId, err }, 'WebSocket error');
      });
    }
  );
}

