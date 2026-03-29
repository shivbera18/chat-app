# Ping - Complete System Design Reference

## High-Level Architecture (HLD)

Ping is designed as a highly scalable, real-time chat application inspired by modern messaging platforms like WhatsApp, Telegram, and Discord. The architecture focuses on horizontally scaling WebSocket connections, decoupling heavy database operations from the main thread, and achieving instantaneous presence and receipt updates.

### 1. Component Overview
- **Client (Frontend)**: React (Vite) + Tailwind + Socket.io-client.
- **API Server & WebSocket Gateway**: Node.js + Express + Socket.io. Validates users, services REST requests, and maintains stateful WebSocket connections.
- **Database**: PostgreSQL (managed using Prisma ORM) for persistent storage of users, chats, and messages.
- **Message Queue / Event Stream**: Redpanda (Kafka-compatible) for asynchronous job processing.
- **In-Memory Datastore / Cache**: Redis for WebSocket adapter scaling, Presence tracking, and Receipt buffering.

---

## 🚀 Advanced System Design Features Implemented

### 1. Multi-Node WebSocket Scaling (Redis Pub/Sub)
**The Problem**: WebSockets are stateful. If Client A connects to Node 1, and Client B connects to Node 2, Node 1 cannot send a message directly to Client B.
**The Solution**: We integrated `@socket.io/redis-adapter`. 
- Every message emitted to a `chatId` room is published to a Redis Pub/Sub channel. 
- All Node.js instances are subscribed to this channel. If Node 2 holds the connection for Client B, it processes the Pub/Sub event and forwards the WebSocket payload to Client B.
- This allows the backend to scale horizontally indefinitely across multiple servers or serverless containers.

### 2. Message Queue for Resilient Delivery (Kafka / Redpanda)
**The Problem**: Writing a message directly to a PostgreSQL database block the Node.js event loop (or adds latency). If there is a sudden spike in messages (e.g., thousands of users sending messages in a large group), the database could bottleneck, crashing the API.
**The Solution**: Asynchronous Event Processing using Kafka.
- When a user sends a message (`socket.on('sendMessage')`), the Node.js Gateway immediately pushes a `chat.message.create_request` event into our Kafka topic (`ping.chat.events`) and acknowledges the client.
- A **Kafka Consumer** (running either locally or on a separate dedicated worker tier) pulls the messages at its own pace and safely batch-inserts them into PostgreSQL via Prisma.
- Once saved, the worker tells the Gateway to emit `receiveMessage` to the WebSocket clients.

### 3. High-Performance Read Receipts (Redis Buffering + Batching)
**The Problem**: Emitting a database `UPDATE` query every time a message is "Delivered" or "Read" generates N+1 queries per message, immediately DDoS'ing our own DB.
**The Solution**: Write-Behind Caching using Redis Lists.
- When a client receives or reads a message, they emit `markDelivered` or `markSeen`.
- Instead of hitting PostgreSQL, the Node.js server pushes the `messageId`, `userId`, and `status` to a Redis List (`ping:receipts_queue`).
- A background worker (`receiptWorker.js`) runs every 5 seconds. It pops up to 100 receipts from the Redis queue and performs a **single bulk update** (`prisma.$transaction`) on PostgreSQL.
- **UX Result**: Real-time tick updates (✓, ✓✓) for users, with only 1 database query every 5 seconds for the server.

### 4. Advanced Online Presence & Heartbeats (Redis Sorted Sets)
**The Problem**: Maintaining the online/offline status of users requires instantaneous lookup without querying a relational database.
**The Solution**: Redis Sorted Sets (ZSETs).
- When a user logs in, the client begins sending a `userOnline` heartbeat every 10 seconds.
- The Node.js server updates the user's score in a Redis Sorted Set (`ping:online_users`) where the **score is the current Timestamp** (`Date.now()`).
- To check if a friend is online, the server just checks if the user's timestamp is within the last 30 seconds (`Date.now() - 30000`). Stale entries are pruned automatically.
- This powers the real-time "Online" and "Offline" header tags natively through WebSockets.

---

## Data Flow Diagram (Message Sending)
1. **Client A** emits `sendMessage`.
2. **Node Gateway** routes payload to **Kafka** (`ping.chat.events`) and returns a temporary placeholder ID to Client A.
3. **Kafka Consumer Worker** pulls the message and writes to **PostgreSQL**.
4. **Worker** emits a "saved" event to the **Gateway**.
5. **Gateway** publishes to **Redis Pub/Sub** (adapter).
6. **Node Gateway (holding Client B)** receives the Redis Publish and emits `receiveMessage` to Client B via WebSockets.
7. **Client B** instantly emits `markDelivered`.
8. **Gateway** writes delivery receipt to **Redis Buffer Queue**.
9. **CRON Worker** grabs receipts at 5-sec intervals and runs a Batch `UPDATE` into **PostgreSQL**.