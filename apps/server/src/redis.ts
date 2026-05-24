import Redis from "ioredis";
import { env } from "./env.js";

// Lazy singleton so unit tests can run without a Redis instance.
let _redis: Redis | null = null;
export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });
    _redis.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error("[redis] error", err.message);
    });
  }
  return _redis;
}

export const roomKey = (code: string) => `worduel:room:${code}`;
