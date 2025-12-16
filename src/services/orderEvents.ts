import { WebSocket } from '@fastify/websocket';
import { OrderUpdate } from '../types/order.types';
import { logger } from '../utils/logger';

const orderSubscribers = new Map<string, Set<WebSocket>>();

export function subscribe(orderId: string, socket: WebSocket): void {
  if (!orderSubscribers.has(orderId)) {
    orderSubscribers.set(orderId, new Set());
  }
  orderSubscribers.get(orderId)!.add(socket);
  logger.debug({ orderId, subscribersCount: orderSubscribers.get(orderId)!.size }, 'Client subscribed to order updates');
}

export function unsubscribe(orderId: string, socket: WebSocket): void {
  const subscribers = orderSubscribers.get(orderId);
  if (subscribers) {
    subscribers.delete(socket);
    logger.debug({ orderId, subscribersCount: subscribers.size }, 'Client unsubscribed from order updates');
    
    // Clean up empty sets
    if (subscribers.size === 0) {
      orderSubscribers.delete(orderId);
    }
  }
}

export function emit(orderId: string, update: OrderUpdate): void {
  const sockets = orderSubscribers.get(orderId);
  if (!sockets || sockets.size === 0) {
    logger.debug({ orderId }, 'No subscribers for order update');
    return;
  }

  const message = JSON.stringify(update);
  let successCount = 0;
  let failureCount = 0;

  for (const socket of sockets) {
    try {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      failureCount++;
      logger.error({ orderId, error }, 'Error sending WebSocket message');
    }
  }

  logger.debug(
    { orderId, status: update.status, successCount, failureCount },
    'Order update emitted to subscribers'
  );
}

export function getActiveSubscribersCount(): number {
  return orderSubscribers.size;
}

