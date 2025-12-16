import { FastifyInstance } from 'fastify';
import { subscribe, unsubscribe } from '../services/orderEvents';

export async function orderSocket(server: FastifyInstance) {
  server.get(
    '/api/orders/ws',
    { websocket: true },
    (connection, request) => {
      const { orderId } = request.query as { orderId?: string };

      if (!orderId) {
        connection.socket.close();
        return;
      }

      // Subscribe client to order updates
      subscribe(orderId, connection.socket);

      // Send initial message
      connection.socket.send(
        JSON.stringify({
          orderId,
          status: 'connected',
          message: 'WebSocket connected'
        })
      );

      const pingInterval = setInterval(() => {
        if (connection.socket.readyState === connection.socket.OPEN) {
          connection.socket.ping();
        }
      }, 5000);

      // Cleanup on disconnect
      connection.socket.on('close', () => {
        clearInterval(pingInterval);
        unsubscribe(orderId, connection.socket);
      });
    }
  );
}
