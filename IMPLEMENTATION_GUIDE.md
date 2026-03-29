# Ping Implementation Guide

This guide explains how core features are implemented, where Redis is used, where Kafka is used, and how to run Kafka with Docker and without Docker.

## 1) High-Level Architecture

- Frontend: React + Vite + Tailwind + Socket.IO client
- Backend: Express + Prisma + Socket.IO + Redis + KafkaJS
- Database: PostgreSQL (Neon)

Runtime flow:

1. REST APIs handle auth/profile/chat metadata.
2. Socket.IO handles real-time events (messages, typing, receipts, reactions).
3. PostgreSQL stores durable entities (users/chats/messages/reactions).
4. Redis handles ephemeral/fast state (presence, secret chat short-lived messages).
5. Kafka streams chat domain events for analytics/notification pipelines.

## 2) Feature Implementation Map

### Authentication

- Register/Login/Logout/profile endpoints are handled in backend controllers.
- JWT access/refresh tokens are issued and set in cookies.
- Frontend stores access token and sends it through Axios request interceptor.

Important files:

- backend auth/profile logic:
  - `backend/src/controllers/user.controller.js`
- token generation:
  - `backend/src/utils/tokenGenerators.js`
- auth middleware:
  - `backend/src/middlewares/verifyJWT.js`
- frontend auth context:
  - `frontend/src/services/authContext.jsx`
- frontend API client:
  - `frontend/src/services/api.js`

### Chat and Message Flow

1. User joins room via `joinRoom` socket event.
2. User sends message via `sendMessage`.
3. Backend persists message in PostgreSQL.
4. Backend emits `receiveMessage` to room.
5. Frontend updates message list (optimistic + server reconciliation).

Important files:

- socket handlers:
  - `backend/src/webSockets/socket.js`
- message persistence/read:
  - `backend/src/controllers/message.controller.js`
- chat CRUD/search:
  - `backend/src/controllers/chat.controller.js`
- frontend conversation UI:
  - `frontend/src/components/chat/singleChat.jsx`
  - `frontend/src/components/chat/message.jsx`

### Reactions

- REST endpoint writes/updates/deletes reaction for `(messageId, userId)`.
- Backend emits `reaction-updated` socket event to chat room.

Important files:

- reaction controller:
  - `backend/src/controllers/reaction.controller.js`

### Read Receipts (WhatsApp-style)

- Frontend emits `markSeen` when last incoming message is visible.
- Backend broadcasts `messageSeenUpdate` in the same room.
- Frontend updates status ticks (`sent`, `delivered`, `seen`) for own messages.

Important files:

- socket read receipt events:
  - `backend/src/webSockets/socket.js`
- status rendering and optimistic mapping:
  - `frontend/src/components/chat/singleChat.jsx`
  - `frontend/src/components/chat/message.jsx`

## 3) Where Redis Is Used

Redis client and fallback behavior:

- `backend/src/redis/redis.js`

Specific Redis use-cases:

1. Presence TTL (`online:<userId>`) via socket `userOnline`.
2. Online lookup endpoint (`/user/online/:userId`).
3. Logout cleanup (`DEL online:<userId>`).
4. Secret chat temporary storage with sorted sets:
   - key: `secret:<chatId>`
   - read recent (last 5 min) via `ZRANGEBYSCORE`
   - cleanup old via `ZREMRANGEBYSCORE`

Relevant files:

- `backend/src/webSockets/socket.js`
- `backend/src/controllers/user.controller.js`
- `backend/src/controllers/secretChat.controller.js`

## 4) Where Kafka Is Used

Kafka bootstrap module:

- `backend/src/kafka/kafka.js`

Boot integration:

- `backend/src/index.js` calls `startKafka()` at startup.

Publish points in socket layer:

- `chat.message.sent`
- `chat.message.seen`
- `chat.typing.started`
- `chat.typing.stopped`

Publish call sites:

- `backend/src/webSockets/socket.js`

Notes:

- Kafka is optional-safe in local dev.
- If `KAFKA_BROKERS` is empty, backend logs that Kafka is disabled and continues.

## 5) Kafka Setup With Docker

This repo includes Redpanda (Kafka-compatible broker) in compose.

### Start stack

```bash
docker compose up -d --build
```

### Verify broker is up

```bash
docker ps | grep ping-redpanda
docker exec -it ping-redpanda rpk cluster info
```

### Verify topic traffic

```bash
docker exec -it ping-redpanda rpk topic list
docker exec -it ping-redpanda rpk topic consume ping.chat.events -n 20
```

Backend config in compose uses:

- `KAFKA_BROKERS=redpanda:9092`

## 6) Kafka Setup Without Docker

Follow Apache Kafka quickstart style local setup.

### Prerequisites

- Java 17+
- Kafka binaries downloaded

### Start local Kafka (KRaft standalone)

```bash
tar -xzf kafka_2.13-4.2.0.tgz
cd kafka_2.13-4.2.0
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"
bin/kafka-storage.sh format --standalone -t $KAFKA_CLUSTER_ID -c config/server.properties
bin/kafka-server-start.sh config/server.properties
```

### Create and inspect topic

```bash
bin/kafka-topics.sh --create --topic ping.chat.events --bootstrap-server localhost:9092
bin/kafka-topics.sh --describe --topic ping.chat.events --bootstrap-server localhost:9092
```

### Configure Ping backend

Set these in `backend/.env`:

```dotenv
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ping-backend
KAFKA_CHAT_TOPIC=ping.chat.events
KAFKA_GROUP_ID=ping-realtime-group
KAFKA_DEBUG=true
```

Then run backend:

```bash
npm --prefix backend run dev
```

## 7) Troubleshooting

### Backend starts but no Kafka events

- Check `KAFKA_BROKERS` is set.
- Ensure broker port is reachable.
- Set `KAFKA_DEBUG=true` temporarily.

### Port already in use (`EADDRINUSE`)

```bash
lsof -i :8000
pkill -f "node src/index.js"
```

### Redis unavailable locally

- Current setup supports optional fallback:
  - `REDIS_OPTIONAL=true`
- For strict mode:
  - `REDIS_OPTIONAL=false`

### Frontend reaches wrong backend

- Verify `frontend/.env.local` values:
  - `VITE_BACKEND_URL=http://localhost:8000`
  - `VITE_SOCKET_URL=http://localhost:8000`

## 8) Quick Ops Checklist

- App health: `GET /ping`
- DB access: run one Prisma query
- Redis online key: check `online:<userId>`
- Kafka stream: consume from `ping.chat.events`
- Frontend build: `npm --prefix frontend run build`
