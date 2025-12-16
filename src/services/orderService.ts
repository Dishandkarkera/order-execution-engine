import { WebSocket } from '@fastify/websocket';

const orderSubscribers = new Map<string, Set<WebSocket>>();

export function subscribe(orderId: string, socket: WebSocket) {
  if (!orderSubscribers.has(orderId)) {
    orderSubscribers.set(orderId, new Set());
  }
  orderSubscribers.get(orderId)!.add(socket);
}

export function unsubscribe(orderId: string, socket: WebSocket) {
  orderSubscribers.get(orderId)?.delete(socket);
}

export function emit(orderId: string, payload: any) {
  const sockets = orderSubscribers.get(orderId);
  if (!sockets) return;

  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }
}
