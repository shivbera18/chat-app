import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { Kafka, logLevel } from "kafkajs";
import { createMessage } from "../controllers/message.controller.js";
import { prisma } from "../db/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const rawBrokers = process.env.KAFKA_BROKERS || "";
const kafkaEnabled = Boolean(rawBrokers.trim());

const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || "ping-backend",
  brokers: rawBrokers
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean),
  logLevel: logLevel.NOTHING,
};

const topic = process.env.KAFKA_CHAT_TOPIC || "ping.chat.events";

let kafka = null;
let producer = null;
let consumer = null;

const startKafka = async (io) => {
  if (!kafkaEnabled) {
    console.log("Kafka disabled. Set KAFKA_BROKERS to enable event streaming.");
    return;
  }

  try {
    kafka = new Kafka(kafkaConfig);
    producer = kafka.producer();
    await producer.connect();

    consumer = kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || "ping-realtime-group",
    });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message?.value) return;
        try {
          const { eventType, payload } = JSON.parse(message.value.toString());
          if (process.env.KAFKA_DEBUG === "true") {
            console.log("Kafka event consumed:", eventType);
          }

          // 2. Message Queue for Resilient Delivery
          // If the event is a message creation request, handle DB write here
          if (eventType === "chat.message.create_request") {
            const { text, senderId, chatId, clientTempId } = payload;
            try {
              const savedMessage = await createMessage({ text, senderId, chatId });

              const sender = await prisma.user.findUnique({
                where: { id: senderId },
                select: { username: true, avatar: true },
              });

              if (io) {
                io.to(chatId).emit("receiveMessage", {
                  id: savedMessage.id,
                  text: savedMessage.text,
                  senderId: savedMessage.senderId,
                  senderName: sender.username,
                  senderAvatar: sender.avatar,
                  sentAt: savedMessage.createdAt,
                  chatId: savedMessage.chatId,
                  clientTempId,
                });
              }

              // Also publish as sent to kafka topic again (optional, for other microservices)
              await publishChatEvent("chat.message.sent", {
                chatId: savedMessage.chatId,
                messageId: savedMessage.id,
                senderId: savedMessage.senderId,
                clientTempId,
              });
              
            } catch (err) {
              console.error("Worker failed processing chat.message.create_request:", err);
            }
          }

        } catch (error) {
          console.warn("Kafka consumer received non-JSON payload or error processing");
        }
      },
    });

    console.log(`Kafka connected on topic: ${topic}`);
  } catch (error) {
    console.error("Kafka startup failed. Continuing without Kafka.", error.message);
    producer = null;
    consumer = null;
  }
};

const publishChatEvent = async (eventType, payload) => {
  if (!producer) {
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [
        {
          key: payload?.chatId || eventType,
          value: JSON.stringify({
            eventType,
            payload,
            emittedAt: new Date().toISOString(),
          }),
        },
      ],
    });
  } catch (error) {
    console.error("Failed to publish Kafka event:", eventType, error.message);
  }
};

export { startKafka, publishChatEvent, kafkaEnabled };