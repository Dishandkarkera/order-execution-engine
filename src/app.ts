import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { orderRoutes } from './api/orders.routes';
import { orderSocket } from './websocket/order-updates.handler';
import { config } from './config/config';
import { logger } from './utils/logger';

// Import worker to start it in the same process (for simplicity)
// In production, you would run workers in separate processes
import './workers/order-execution.worker';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register WebSocket plugin
server.register(websocket);

// Register routes
server.register(orderRoutes);
server.register(orderSocket);

// Health check endpoint
server.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Received shutdown signal');

  try {
    await server.close();
    logger.info('Server closed successfully');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async (): Promise<void> => {
  try {
    await server.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(
      {
        port: config.port,
        host: config.host,
        nodeEnv: process.env.NODE_ENV || 'development',
      },
      '🚀 Order Execution Engine started'
    );
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

start();

