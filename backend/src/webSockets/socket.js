// socketServer.js
import { Server } from "socket.io";
import { client } from "../redis/redis.js";
import { prisma } from "../db/prisma.js";
import { publishChatEvent, kafkaEnabled } from "../kafka/kafka.js";
import { createMessage } from "../controllers/message.controller.js";
import { markUserOnline, markUserOffline, getOnlineUsers } from "../redis/presence.js";
import { bufferReceipt } from "../redis/receiptsBuffer.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { redisUrl, isOptional } from "../redis/redis.js";

export const setupSocket = (server) => {
  const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        const isLocal = !!origin && allowedOrigins.includes(origin);
        const isVercel = origin && origin.endsWith(".vercel.app");

        if (!origin || isLocal || isVercel) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    // pingInterval: 10000, // ← MATCH CLIENT
    // pingTimeout: 5000 // ← MATCH CLIENT
  });

  // 1. Multi-node WebSocket Scaling (Redis Pub/Sub)
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis adapter attached to Socket.io for multi-node scaling");
  }).catch(err => {
    if (!isOptional) {
      console.warn("Could not connect Redis pub/sub clients for adapter", err.message);
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinRoom", async (data) => {
      const { chatId, userId } = data;
      socket.data.userId = userId;
      console.log(
        `user is connected with another user, having chatId : ${chatId}`,
      );
      socket.join(chatId);
    });

    // Handle sending messages
    socket.on("sendMessage", async (data) => {
      const { chatId, text, senderId, clientTempId } = data;
      console.log("Sending message with:", { chatId, text, senderId });
      if (chatId && text && senderId) {
        try {
          if (kafkaEnabled) {
            // Offload to Kafka Queue instead of writing to DB directly
            await publishChatEvent("chat.message.create_request", {
              text,
              senderId,
              chatId,
              clientTempId,
            });
            console.log("Message creation requested via Kafka for chat:", chatId);
          } else {
            // Fallback to direct DB write
            const savedMessage = await createMessage({
              text,
              senderId,
              chatId, // Ensure chatId corresponds to an existing chat
            });
            console.log("Message saved:", savedMessage);
  
            const sender = await prisma.user.findUnique({
              where: { id: senderId },
              select: { username: true, avatar: true },
            });
  
            io.to(chatId).emit("receiveMessage", {
              id: savedMessage.id,
              text: savedMessage.text,
              senderId: savedMessage.senderId,
              senderName: sender.username,
              senderAvatar: sender.avatar,
              sentAt: savedMessage.createdAt,
              chatId: savedMessage.chatId,
              clientTempId,
              status: savedMessage.status || "SENT",
            });
          }
        } catch (error) {
          console.error(
            "Error saving message from socket",
            socket.id,
            ":",
            error,
          );
          socket.emit("errorMessage", { error: "Message could not be saved" });
        }
      } else {
        console.log(`Invalid message data from socket ${socket.id}`);
      }
    });

    socket.on("userOnline", async (data) => {
      const { userId } = data;
      socket.data.userId = userId; // Store for disconnect
      await markUserOnline(userId);
      // Optional: Broadcast globally that user is online
      io.emit("statusUpdate", { userId, status: "online" });
    });

    socket.on("checkOnlineUsers", async ({ userIds }, callback) => {
      if (userIds && userIds.length > 0) {
        const statuses = await getOnlineUsers(userIds);
        if (callback) callback(statuses);
      }
    });

    socket.on("typing", async (data) => {
      const { chatId, userId } = data;
      socket.to(chatId).emit("userTyping", { chatId, userId });
      if (kafkaEnabled) await publishChatEvent("chat.typing.started", { chatId, userId });
    });

    socket.on("stopTyping", ({ chatId, userId }) => {
      socket.to(chatId).emit("userStopTyping", { userId });
      if (kafkaEnabled) publishChatEvent("chat.typing.stopped", { chatId, userId });
    });

    socket.on("markDelivered", async ({ chatId, messageId, userId }) => {
      if (!chatId || !messageId) return;
      io.to(chatId).emit("messageStatusUpdate", { chatId, messageId, status: "DELIVERED" });
      await bufferReceipt(messageId, "DELIVERED", userId, chatId);
    });

    socket.on("markSeen", async ({ chatId, messageId, userId }) => {
      if (!chatId || !messageId) return;
      const seenAt = new Date().toISOString();
      io.to(chatId).emit("messageStatusUpdate", { chatId, messageId, status: "READ", seenAt });
      await bufferReceipt(messageId, "READ", userId, chatId);
      
      if (kafkaEnabled) {
        await publishChatEvent("chat.message.seen", { chatId, messageId, userId, seenAt });
      }
    });

    socket.on("sendSecretMessage", async (data) => {
      const { chatId, userId, msg } = data;
      try {
        await prisma.message.create({ userId, chatId, msg });
        io.to(chatId).emit("receiveSecretMessage", { userId, msg, timestamp: Date.now() });
      } catch (error) {
        console.error("Error handling sendSecretMessage:", error);
        socket.emit("errorSecretMessage", { error: error.message });
      }
    });

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.id}`);
      if (socket.data.userId) {
        await markUserOffline(socket.data.userId);
        io.emit("statusUpdate", { userId: socket.data.userId, status: "offline" });
      }
    });
  });
  return io;
};
