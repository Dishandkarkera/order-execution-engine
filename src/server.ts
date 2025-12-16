import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { orderRoutes } from './api/orders';
import { orderSocket } from './ws/orderSocket';
import './queue/orderWorker';

const server = Fastify({
  logger: true
});

server.register(websocket);
server.register(orderRoutes);
server.register(orderSocket);

// Health check
server.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Server running at http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
