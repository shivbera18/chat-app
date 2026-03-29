import { client } from "./redis.js";

const ONLINE_SET_KEY = "ping:online_users";
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

/**
 * Mark a user as online by updating their score in the sorted set
 */
export const markUserOnline = async (userId) => {
  if (!userId) return;
  try {
    await client.zAdd(ONLINE_SET_KEY, [
      { score: Date.now(), value: userId },
    ]);
  } catch (error) {
    console.error("Redis Presence Error (Online):", error.message);
  }
};

/**
 * Mark a user as offline by removing them from the sorted set
 */
export const markUserOffline = async (userId) => {
  if (!userId) return;
  try {
    await client.zRem(ONLINE_SET_KEY, userId);
  } catch (error) {
    console.error("Redis Presence Error (Offline):", error.message);
  }
};

/**
 * Get online status for a list of user IDs
 * Returns an object { [userId]: boolean }
 */
export const getOnlineUsers = async (userIds = []) => {
  if (!userIds.length) return {};
  
  try {
    // Clean up stale users first (older than 30s)
    const cutoff = Date.now() - HEARTBEAT_INTERVAL_MS;
    await client.zRemRangeByScore(ONLINE_SET_KEY, 0, cutoff);

    const onlineStatus = {};
    for (const userId of userIds) {
      const score = await client.zScore(ONLINE_SET_KEY, userId);
      onlineStatus[userId] = score !== null && score >= cutoff;
    }
    return onlineStatus;
  } catch (error) {
    console.error("Redis Presence Error (Get Users):", error.message);
    return {};
  }
};
