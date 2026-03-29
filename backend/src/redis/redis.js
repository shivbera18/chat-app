import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { createClient } from "redis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const isOptional = process.env.REDIS_OPTIONAL !== "false";

const realClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 1200,
    reconnectStrategy: isOptional ? false : undefined,
  },
});

const fallbackClient = {
  get: async () => null,
  set: async () => null,
  del: async () => 0,
  zAdd: async () => 0,
  zScore: async () => null,
  zRangeByScore: async () => [],
  zRemRangeByScore: async () => 0,
  zRem: async () => 0,
  zCard: async () => 0,
  expire: async () => 0,
  lPush: async () => 0,
  rPop: async () => null,
  rPopCount: async () => [],
};

let client = realClient;

realClient.on("error", (err) => {
  if (!isOptional) {
    console.log("Redis Client Error", err);
  }
});

try {
  await realClient.connect();
  console.log(`Redis connected: ${redisUrl}`);
} catch (err) {
  if (!isOptional) {
    throw err;
  }
  console.warn(
    `Redis unavailable at ${redisUrl}. Continuing in fallback mode for local development.`,
  );
  client = fallbackClient;
}

export { client, redisUrl, isOptional };
