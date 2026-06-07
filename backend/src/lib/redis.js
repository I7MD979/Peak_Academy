import { Redis } from "@upstash/redis";

let _redis = null;

export function getRedis() {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[redis] Upstash credentials not set — OAuth token store unavailable");
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}
