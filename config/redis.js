const redis = require("redis");
require("dotenv").config();

const redisPublisher = redis.createClient({ url: process.env.REDIS_URL });
const redisSubscriber = redis.createClient({ url: process.env.REDIS_URL });
const redisQueue = redis.createClient({ url: process.env.REDIS_URL });

(async () => {
  await redisPublisher.connect();
  await redisSubscriber.connect();
  await redisQueue.connect();
})();

module.exports = { redisPublisher, redisSubscriber, redisQueue };
