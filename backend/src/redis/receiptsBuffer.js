import { client } from "./redis.js";

const RECEIPTS_QUEUE = "ping:receipts_queue";

/**
 * Push a delivery or read receipt into the Redis list buffer
 * @param {string} messageId 
 * @param {string} status 'DELIVERED' or 'READ'
 * @param {string} userId 
 * @param {string} chatId 
 */
export const bufferReceipt = async (messageId, status, userId, chatId) => {
  try {
    const payload = JSON.stringify({ messageId, status, userId, chatId, ts: Date.now() });
    await client.lPush(RECEIPTS_QUEUE, payload);
  } catch (error) {
    console.error("Redis Receipt Buffer Error:", error.message);
  }
};

/**
 * Pop up to `count` items from the receipt buffer
 */
export const popReceipts = async (count = 100) => {
  try {
    // If client is mocked/fallback, return empty
    if (!client.rPopCount) {
       // simple fallback mapping if rPopCount doesn't exist
       const items = [];
       for(let i=0; i<count; i++) {
           const item = await client.rPop(RECEIPTS_QUEUE);
           if (!item) break;
           items.push(item);
       }
       return items;
    }
    
    const items = await client.rPopCount(RECEIPTS_QUEUE, count);
    return items || [];
  } catch (error) {
    console.error("Redis Receipt Pop Error:", error.message);
    return [];
  }
};
