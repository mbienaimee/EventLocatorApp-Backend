// config/redis.js
const Redis = require("ioredis");

const redisPublisher = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379"
);
const redisSubscriber = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

redisPublisher.on("connect", () => console.log("Redis publisher connected"));
redisPublisher.on("error", (err) =>
  console.error("Redis publisher error:", err.message)
);

redisSubscriber.on("connect", () => console.log("Redis subscriber connected"));
redisSubscriber.on("error", (err) =>
  console.error("Redis subscriber error:", err.message)
);

module.exports = { redisPublisher, redisSubscriber };
