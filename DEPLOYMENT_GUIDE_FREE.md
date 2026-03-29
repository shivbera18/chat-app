# Free Tier Deployment Guide for Ping

This guide walks you through deploying the fully-scaled Ping architecture (Node.js, React, PostgreSQL, Redis, Kafka) using 100% free-tier services. 

## 1. Database: Neon (PostgreSQL)
Neon is a serverless Postgres platform that offers a generous free tier.
1. Go to [Neon.tech](https://neon.tech) and sign up.
2. Create a new project. 
3. Copy the **Postgres Connection String** (it should look like `postgresql://user:password@ep-something.pooler.neon.tech/neondb?sslmode=require`).
4. Keep this handy for your `.env` file as `DATABASE_URL`.

## 2. In-Memory Store: Upstash (Redis)
Upstash provides serverless Redis with a free tier perfect for pub/sub, presence, and caching.
1. Go to [Upstash.com](https://upstash.com) and sign up.
2. Create a Redis Database (Global or Regional, choose the region closest to your backend).
3. Copy the **Redis URL** (`rediss://default:password@endpoint.upstash.io:port`).
4. Save this as `REDIS_URL` in your `.env`.

## 3. Event Queue: Upstash (Kafka)
We will use Upstash Serverless Kafka as our Redpanda/Kafka replacement in production.
1. In your Upstash console, go to the **Kafka** tab and Create a Cluster.
2. Create a Topic inside the cluster named `ping.chat.events`.
3. Go to the "Details" tab of your cluster to find the `UPSTASH_KAFKA_REST_URL` and `UPSTASH_KAFKA_REST_PASSWORD` or the standard Kafka Broker strings/SASL configs.
   * *Note: `kafkajs` requires SASL settings. In Upstash, look for the Node.js/Kafkajs connection snippet.*
4. Extract the comma-separated URLs and save as `KAFKA_BROKERS`.

## 4. Image Hosting: Cloudinary
1. Sign up at [Cloudinary.com](https://cloudinary.com).
2. Copy your Cloud Name, API Key, and API Secret.

## 5. Backend Deployment: Render (Node.js)
Render offers a free tier for web services. Since WebSockets need a persistent connection, Render is a great fit.
1. Go to [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository containing the `Ping-v1` codebase.
4. Set the Root Directory to `backend` (if you deploy as a monorepo).
5. Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
6. Start Command: `npm start` (Make sure your `package.json` has `"start": "node src/index.js"`).
7. Under **Environment Variables**, paste:
   * `DATABASE_URL` (From Neon)
   * `REDIS_URL` (From Upstash)
   * `KAFKA_BROKERS` (From Upstash)
   * `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   * `JWT_SECRET` and `REFRESH_TOKEN_SECRET` (generate random strings)
   * `CLIENT_ORIGINS` (leave blank until you deploy frontend, then add your Vercel URL)
8. Deploy! Render will give you an API URL (e.g., `https://ping-backend-xyz.onrender.com`).

## 6. Frontend Deployment: Vercel
1. Go to [Vercel.com](https://vercel.com).
2. Click **Add New Project** and select your GitHub repo.
3. Use the following Settings:
   * Framework Preset: **Vite**
   * Root Directory: `frontend`
4. Add Environment Variables:
   * `VITE_API_URL`: `https://ping-backend-xyz.onrender.com/api/v1`
   * `VITE_SOCKET_URL`: `https://ping-backend-xyz.onrender.com`
5. Click **Deploy**. Vercel will give you a hosted URL (e.g., `https://ping-v1.vercel.app`).
6. **Important:** Go back to Render Backend -> Environment Variables, and update `CLIENT_ORIGINS` to include your new Vercel URL: `https://ping-v1.vercel.app`. Restart the backend.

---

### Final Checklist ✅
- [ ] Neon Postgres is active and schema is migrated.
- [ ] Upstash Redis connects successfully (Backend logs: `Redis connected`).
- [ ] Upstash Kafka connects successfully via `kafkajs` (Backend logs: `Kafka connected`).
- [ ] Frontend can connect to Socket.io endpoint.
- [ ] You can send/receive messages and see read receipts populating across the cluster.