# Order Execution Engine

A backend service that processes market orders asynchronously, routes them to the best available DEX (mocked), and streams real-time execution updates via WebSockets.

---

## Overview

This project implements a backend **order execution engine** designed to demonstrate real-world backend system design.  
The focus is on **asynchronous processing**, **clean separation of concerns**, and **real-time order status updates**, rather than UI or blockchain mainnet integration.

---

## Key Features

- Market order execution (single order type as required)
- Asynchronous processing using BullMQ and Redis
- Real-time order lifecycle updates via WebSocket
- Clean, modular backend architecture
- Deterministic and testable execution flow

---

## Tech Stack

- Node.js + TypeScript
- Fastify (HTTP + WebSocket)
- BullMQ (job queue)
- Redis (Docker)

---

## System Architecture

```
Client
  |
  | POST /api/orders/execute
  v
Fastify API
  |
  | enqueue job
  v
BullMQ Queue (Redis)
  |
  | process job
  v
Worker
  |
  | emit lifecycle events
  v
WebSocket Subscribers
```

---

## Order Lifecycle

Each order progresses through the following states:

- `pending` – Order accepted  
- `routing` – Selecting best DEX (mocked)  
- `building` – Transaction construction  
- `submitted` – Transaction submission  
- `confirmed` – Order executed successfully  

Lifecycle updates are emitted in real time via WebSocket.

---

## API Documentation

### Create Order

**Endpoint**
```
POST /api/orders/execute
```

**Request Body**
```json
{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1.5,
  "slippage": 0.01
}
```

**Response**
```json
{
  "orderId": "uuid",
  "status": "pending",
  "wsUrl": "ws://localhost:3000/api/orders/ws?orderId=uuid"
}
```

---

## WebSocket Subscription

**Endpoint**
```
GET /api/orders/ws?orderId=<orderId>
```

Clients subscribing to this endpoint receive real-time order status updates as the order is processed.

---

## Mock DEX Routing

DEX routing and transaction execution are **mocked intentionally**.

This keeps the focus on backend execution flow, queue-based processing, and real-time communication, as permitted by the assignment.  
No real blockchain or on-chain transactions are executed.

---

## Running the Project

### Prerequisites
- Node.js
- Docker (for Redis)

### Start Redis
```bash
docker run -d -p 6379:6379 --name redis redis:7
```

### Start the Backend
```bash
npm install
npm run dev
```

### Health Check
```
GET http://localhost:3000/health
```

---

## Design Decisions

### Market Orders Only
Market orders exercise the full execution pipeline immediately, making them ideal for demonstrating routing, execution, and real-time updates.

### Queue-Based Processing
BullMQ decouples request handling from execution, reflecting real-world trading system architecture.

### Event-Based WebSocket Design
The worker emits lifecycle events without awareness of connected clients, keeping business logic decoupled from transport logic.

---

## Known Limitations

- WebSocket lifecycle testing via CLI tools (e.g., `wscat`) may close connections early due to client inactivity.  
  In real-world clients (browser or service-based), connections remain active and receive updates as expected.

- DEX execution is mocked and does not interact with mainnet or testnet environments.

---

## Extensibility

This system can be extended to support:
- Limit or advanced order types
- Real on-chain transaction execution
- Persistent order state and replay
- Authentication and user accounts
- Multiple DEX integrations

---

## Conclusion

This project demonstrates a **production-style backend execution engine**, emphasizing asynchronous processing, clean architecture, and real-time event streaming.  
It is intentionally scoped to highlight backend engineering principles rather than UI or blockchain complexity.
