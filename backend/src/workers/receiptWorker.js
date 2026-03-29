import { popReceipts } from "../redis/receiptsBuffer.js";
import { prisma } from "../db/prisma.js";

// Run every 5 seconds
const BATCH_INTERVAL = 5000;
let isProcessing = false;

export const startReceiptWorker = () => {
  setInterval(async () => {
    if (isProcessing) return;
    
    isProcessing = true;
    try {
      const receipts = await popReceipts(100);
      if (!receipts || receipts.length === 0) {
        isProcessing = false;
        return;
      }

      const parsedReceipts = receipts.map((r) => {
        try { return JSON.parse(r); } catch (e) { return null; }
      }).filter(Boolean);
      
      const deliveredIds = parsedReceipts.filter(r => r.status === 'DELIVERED').map(r => r.messageId);
      const readIds = parsedReceipts.filter(r => r.status === 'READ').map(r => r.messageId);

      const ops = [];
      if (deliveredIds.length > 0) {
        ops.push(
          prisma.message.updateMany({
            where: { id: { in: deliveredIds }, status: 'SENT' },
            data: { status: 'DELIVERED' }
          })
        );
      }

      if (readIds.length > 0) {
        ops.push(
          prisma.message.updateMany({
            where: { id: { in: readIds } },
            data: { status: 'READ' }
          })
        );
      }

      if (ops.length > 0) {
        await prisma.$transaction(ops);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Batch Worker] Processed ${deliveredIds.length} DELIVERED and ${readIds.length} READ receipts.`);
        }
      }
      
    } catch (error) {
      console.error("[Batch Worker] Error processing receipts:", error);
    } finally {
      isProcessing = false;
    }
  }, BATCH_INTERVAL);
  
  if (process.env.NODE_ENV !== 'test') {
    console.log("Redis Receipt Batch Worker started.");
  }
};
