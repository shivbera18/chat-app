import { createClient } from "redis";

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
  zRangeByScore: async () => [],
  zRemRangeByScore: async () => 0,
  zCard: async () => 0,
  expire: async () => 0,
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

export { client };
