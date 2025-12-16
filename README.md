# Order Execution Engine

A production-quality backend system for asynchronous order execution with real-time WebSocket updates. This project demonstrates modern backend architecture using TypeScript, job queues, and event-driven design.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Order Lifecycle](#order-lifecycle)
- [API Documentation](#api-documentation)
- [WebSocket Protocol](#websocket-protocol)
- [Design Decisions](#design-decisions)
- [Setup Instructions](#setup-instructions)
- [Project Structure](#project-structure)
- [Known Limitations](#known-limitations)
- [Production Considerations](#production-considerations)

---

## 🎯 Overview

This project implements a backend **order execution engine** designed to demonstrate real-world backend system design. The focus is on **asynchronous processing**, **clean separation of concerns**, and **real-time order status updates** via WebSocket connections.

The system handles market orders, routing them through a mocked DEX (Decentralized Exchange) selection process, and provides real-time updates to connected clients as the order progresses through various execution stages.

---

## ✨ Key Features

- **Asynchronous Order Processing**: Orders are queued immediately and processed asynchronously using BullMQ
- **Real-time Updates**: WebSocket connections provide live status updates as orders progress
- **Clean Architecture**: Clear separation of concerns with modular, maintainable code structure
- **Type Safety**: Full TypeScript implementation with strict mode enabled
- **Graceful Shutdown**: Proper cleanup and shutdown handling for production readiness
- **Structured Logging**: Comprehensive logging using Pino for observability
- **Production-Ready**: Environment-based configuration, error handling, and health checks

---

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **HTTP Framework**: Fastify (high-performance HTTP server)
- **WebSocket**: @fastify/websocket (for real-time communication)
- **Queue System**: BullMQ (Redis-backed job queue)
- **Message Broker**: Redis (for queue persistence)
- **Logging**: Pino (high-performance structured logging)
- **Order Type**: Market Orders only

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                  │
│                      (HTTP + WebSocket)                          │
└────────────┬──────────────────────────┬─────────────────────────┘
             │                          │
             │ POST /api/orders/execute │ WS /api/orders/ws
             │                          │
             ↓                          ↓
┌────────────────────────────────────────────────────────────────┐
│                      FASTIFY SERVER                             │
│  ┌──────────────────┐         ┌─────────────────────────────┐  │
│  │   API Routes     │         │  WebSocket Handler          │  │
│  │  (orders.routes) │         │  (order-updates.handler)    │  │
│  └────────┬─────────┘         └──────────┬──────────────────┘  │
│           │                               │                     │
└───────────┼───────────────────────────────┼─────────────────────┘
            │                               │
            │ enqueue job                   │ subscribe
            ↓                               ↓
┌────────────────────────┐     ┌────────────────────────┐
│    BULLMQ QUEUE        │     │   Event Service        │
│    (Redis-backed)      │     │   (In-Memory Pub/Sub)  │
└────────────┬───────────┘     └────────────┬───────────┘
             │                               ↑
             │ process job                   │ emit events
             ↓                               │
┌────────────────────────────────────────────┴────────────────────┐
│                      ORDER WORKER                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Routing    → Select DEX (Uniswap, Sushiswap, etc.)  │   │
│  │  2. Building   → Construct transaction                   │   │
│  │  3. Submitting → Submit to blockchain (mocked)           │   │
│  │  4. Confirmed  → Final success state                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Components:**

1. **API Layer**: Handles incoming HTTP requests, validates input, and queues orders
2. **Queue System**: BullMQ manages job persistence and retry logic
3. **Worker Process**: Consumes jobs from the queue and processes orders
4. **Event Service**: In-memory pub/sub for decoupling workers from WebSocket connections
5. **WebSocket Layer**: Manages client connections and broadcasts order updates

---

## 🔄 Order Lifecycle

Each order progresses through the following states:

```
┌──────────┐   Queue Job   ┌──────────┐   Select DEX   ┌──────────┐
│ PENDING  │ ────────────> │ ROUTING  │ ─────────────> │ BUILDING │
└──────────┘               └──────────┘                 └──────────┘
                                                              │
                                                              │
                                                              ↓
┌───────────┐  Complete  ┌───────────┐  Submit Tx  ┌──────────────┐
│ CONFIRMED │ <───────── │ SUBMITTED │ <─────────── │   (Build)    │
└───────────┘            └───────────┘              └──────────────┘

                           ┌─────────┐
                           │ FAILED  │  (on error)
                           └─────────┘
```

**Stage Details:**

- **pending** (0ms) - Order received and queued
- **routing** (100-300ms) - Mock DEX selection (Uniswap, Sushiswap, etc.)
- **building** (200-400ms) - Mock transaction construction
- **submitted** (150-350ms) - Mock blockchain submission with tx hash
- **confirmed** (300-500ms) - Final success state
- **failed** - Error state (if processing fails)

All transitions are broadcast in real-time to connected WebSocket clients.

---

## 📡 API Documentation

### Create Order

Submit a new market order for execution.

**Endpoint:**
```
POST /api/orders/execute
```

**Request Body:**
```json
{
  "tokenIn": "USDC",
  "tokenOut": "ETH",
  "amountIn": 1000,
  "slippage": 0.5
}
```

**Request Fields:**
- `tokenIn` (string, required): Input token symbol
- `tokenOut` (string, required): Output token symbol
- `amountIn` (number, required): Amount of input token (must be positive)
- `slippage` (number, optional): Allowed slippage percentage (0-1, default: 0.005)

**Response (200 OK):**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "wsUrl": "ws://localhost:3000/api/orders/ws?orderId=550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Missing required fields: tokenIn, tokenOut, amountIn"
}
```

### Health Check

Check server health and uptime.

**Endpoint:**
```
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-12-16T10:30:45.123Z",
  "uptime": 3600.5
}
```

---

## 🔌 WebSocket Protocol

### Connection

**Endpoint:**
```
GET /api/orders/ws?orderId=<uuid>
```

**Query Parameters:**
- `orderId` (required): The UUID of the order to subscribe to

### Connection Flow

1. Client connects with order ID in query parameters
2. Server validates order ID and establishes WebSocket connection
3. Server sends initial connection confirmation message
4. Server pushes status updates as order progresses
5. Keep-alive pings sent every 30 seconds
6. Client can disconnect at any time

### Message Format

All messages are JSON-encoded strings:

**Connection Message:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "connected",
  "timestamp": "2025-12-16T10:30:45.123Z",
  "metadata": {
    "message": "WebSocket connected successfully"
  }
}
```

**Order Update Messages:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "timestamp": "2025-12-16T10:30:46.456Z",
  "metadata": {
    "selectedDex": "Uniswap V3",
    "message": "Routing to Uniswap V3"
  }
}
```

```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted",
  "timestamp": "2025-12-16T10:30:48.789Z",
  "metadata": {
    "txHash": "0xabc123...",
    "message": "Transaction submitted to blockchain"
  }
}
```

```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "confirmed",
  "timestamp": "2025-12-16T10:30:50.012Z",
  "metadata": {
    "txHash": "0xabc123...",
    "selectedDex": "Uniswap V3",
    "message": "Order executed successfully"
  }
}
```

### Status Values

- `connected` - WebSocket connection established
- `pending` - Order queued for processing
- `routing` - Selecting optimal DEX
- `building` - Constructing transaction
- `submitted` - Transaction submitted
- `confirmed` - Order successfully executed
- `failed` - Order execution failed

---

## 🎨 Design Decisions

### Why Fastify?

Fastify was chosen over Express for several reasons:
- **Performance**: One of the fastest Node.js web frameworks
- **Built-in WebSocket support**: Official WebSocket plugin with excellent integration
- **Schema validation**: Built-in JSON schema validation
- **Modern**: Better TypeScript support and async/await patterns
- **Plugin architecture**: Clean modular design

### Why BullMQ?

BullMQ provides enterprise-grade job queue features:
- **Reliability**: Redis-backed persistence ensures jobs aren't lost
- **Retry logic**: Automatic retry with exponential backoff
- **Concurrency control**: Easily scale workers horizontally
- **Job scheduling**: Support for delayed and repeated jobs
- **Modern API**: Built specifically for modern Node.js (async/await)

### Event-Driven Architecture

The system uses an in-memory event emitter pattern to decouple the worker process from WebSocket connections:

**Benefits:**
- Workers don't need to know about WebSocket implementation
- Multiple WebSocket connections can subscribe to the same order
- Easy to replace with Redis Pub/Sub for multi-server deployments
- Clean separation of concerns

### Mock Implementation Strategy

All blockchain and DEX interactions are mocked:
- **Focus on architecture**: Demonstrates system design rather than blockchain complexity
- **Realistic behavior**: Includes random delays and DEX selection
- **Easy testing**: No external dependencies or network calls
- **Production-ready structure**: Easy to replace mocks with real implementations

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js**: v18 or higher
- **Docker**: For running Redis
- **npm**: v8 or higher

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd order-execution-engine
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Start Redis

Using Docker:
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

Or using Docker Compose (create `docker-compose.yml`):
```yaml
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

Then run:
```bash
docker-compose up -d
```

### Step 4: Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` if you need to change defaults:
```env
PORT=3000
HOST=0.0.0.0
REDIS_HOST=localhost
REDIS_PORT=6379
WORKER_CONCURRENCY=5
LOG_LEVEL=info
```

### Step 5: Build the Project

```bash
npm run build
```

### Step 6: Run the Application

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

**Separate worker process** (optional):
```bash
npm run worker
```

### Step 7: Verify Installation

Check health endpoint:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-16T10:30:45.123Z",
  "uptime": 10.5
}
```

### Step 8: Test Order Execution

Submit a test order:
```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "USDC",
    "tokenOut": "ETH",
    "amountIn": 1000,
    "slippage": 0.5
  }'
```

Connect to WebSocket (using `wscat` or similar):
```bash
npm install -g wscat
wscat -c "ws://localhost:3000/api/orders/ws?orderId=<orderId-from-response>"
```

You should see real-time updates as the order progresses through its lifecycle.

---

## 📁 Project Structure

```
order-execution-engine/
├── src/
│   ├── api/                      # HTTP routes and handlers
│   │   └── orders.routes.ts      # Order execution endpoint
│   ├── websocket/                # WebSocket connection handlers
│   │   └── order-updates.handler.ts  # WebSocket order updates
│   ├── services/                 # Business logic services
│   │   └── orderEvents.ts        # Event pub/sub service
│   ├── workers/                  # BullMQ worker implementation
│   │   └── order-execution.worker.ts  # Order processing worker
│   ├── queues/                   # Queue definitions
│   │   └── order.queue.ts        # BullMQ queue configuration
│   ├── types/                    # TypeScript interfaces and types
│   │   └── order.types.ts        # Order-related type definitions
│   ├── utils/                    # Helpers and utilities
│   │   └── logger.ts             # Pino logger configuration
│   ├── config/                   # Configuration management
│   │   └── config.ts             # Environment-based config
│   ├── dex/                      # DEX-related functionality
│   │   └── mockDexRouter.ts      # Mock DEX selection logic
│   └── app.ts                    # Application bootstrap and server
├── dist/                         # Compiled JavaScript (generated)
├── node_modules/                 # Dependencies (generated)
├── package.json                  # Project metadata and scripts
├── package-lock.json             # Dependency lock file
├── tsconfig.json                 # TypeScript configuration
├── .env.example                  # Example environment variables
├── .gitignore                    # Git ignore patterns
└── README.md                     # This file
```

---

## ⚠️ Known Limitations

### Mocked Functionality

- **No real blockchain integration**: All blockchain interactions are simulated
- **No real DEX integration**: DEX selection is random, not based on actual rates
- **No persistent storage**: Order state is not persisted to a database
- **In-memory pub/sub**: Events use in-memory storage (not suitable for multi-server)

### Testing Considerations

- **WebSocket testing**: CLI tools like `wscat` may close connections early due to inactivity
- **No authentication**: The API has no authentication or authorization
- **No rate limiting**: Endpoints are not rate-limited

### Development Focus

This is a demonstration project focused on:
- System architecture and design patterns
- Asynchronous processing patterns
- Real-time communication protocols
- TypeScript best practices

It is **not** focused on:
- UI/frontend implementation
- Actual blockchain/DeFi integration
- Production-grade security measures

---

## 🏭 Production Considerations

To make this production-ready, you would need to add:

### Infrastructure

- **Multiple servers**: Load balancer for horizontal scaling
- **Redis Pub/Sub**: Replace in-memory events for multi-server support
- **Database**: PostgreSQL or MongoDB for order persistence
- **Message queue**: Consider Kafka for higher throughput
- **Monitoring**: Prometheus + Grafana for metrics
- **Tracing**: OpenTelemetry for distributed tracing

### Security

- **Authentication**: JWT or OAuth2 for API access
- **Authorization**: Role-based access control
- **Rate limiting**: Prevent API abuse
- **Input sanitization**: Additional validation layers
- **HTTPS/WSS**: TLS encryption for all connections

### Reliability

- **Circuit breakers**: Prevent cascade failures
- **Timeouts**: Request and job timeouts
- **Dead letter queues**: Handle failed jobs
- **Health checks**: Kubernetes-style health probes
- **Graceful degradation**: Fallback mechanisms

### Observability

- **Structured logging**: Consistent log format across services
- **Metrics**: Track order completion rates, latency, errors
- **Alerts**: Automated alerting for critical issues
- **Dashboards**: Real-time monitoring dashboards

### Data Management

- **Order persistence**: Save order state to database
- **Order history**: Query past orders
- **Audit logs**: Track all order state changes
- **Idempotency**: Prevent duplicate order submission

---

## 📝 License

ISC

---

## 👥 Contributing

This is a demonstration project for interview/educational purposes. Contributions are welcome for educational improvements.

---

## 📚 Additional Resources

- [Fastify Documentation](https://www.fastify.io/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Built with ❤️ for demonstrating production-quality backend architecture**

