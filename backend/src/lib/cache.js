import { isEnabled } from "../utils/featureFlags.js";

const memoryStore = new Map();

let redisClient = null;
let redisMode = "memory";

async function getRedisClient() {
  if (redisClient) return redisClient;

  if (
    isEnabled("FF_REDIS_CACHE_ENABLED") &&
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    try {
      const { Redis } = await import("@upstash/redis");
      const upstash = Redis.fromEnv();
      redisClient = {
        async get(key) {
          const value = await upstash.get(key);
          if (value === null || value === undefined) return null;
          return typeof value === "string" ? JSON.parse(value) : value;
        },
        async setex(key, ttl, value) {
          await upstash.set(key, value, { ex: ttl });
        },
        async del(...keys) {
          if (keys.length) await upstash.del(...keys);
        },
        async scanKeys(prefix) {
          try {
            const keys = await upstash.keys(`${prefix}*`);
            return Array.isArray(keys) ? keys : [];
          } catch {
            return [];
          }
        }
      };
      redisMode = "upstash";
      return redisClient;
    } catch (error) {
      console.warn("Upstash Redis unavailable, using in-memory cache:", error.message);
    }
  }

  if (isEnabled("FF_REDIS_CACHE_ENABLED") && process.env.REDIS_URL) {
    try {
      const IORedis = (await import("ioredis")).default;
      const client = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
      redisClient = {
        async get(key) {
          const value = await client.get(key);
          return value ? JSON.parse(value) : null;
        },
        async setex(key, ttl, value) {
          await client.setex(key, ttl, JSON.stringify(value));
        },
        async del(...keys) {
          if (keys.length) await client.del(...keys);
        },
        async scanKeys(prefix) {
          const found = [];
          let cursor = "0";
          do {
            const [next, keys] = await client.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
            cursor = next;
            found.push(...keys);
          } while (cursor !== "0");
          return found;
        }
      };
      redisMode = "ioredis";
      return redisClient;
    } catch (error) {
      console.warn("IORedis unavailable, using in-memory cache:", error.message);
    }
  }

  redisMode = "memory";
  redisClient = {
    async get(key) {
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    },
    async setex(key, ttl, value) {
      memoryStore.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    },
    async del(...keys) {
      for (const key of keys) memoryStore.delete(key);
    },
    async scanKeys(prefix) {
      const now = Date.now();
      const keys = [];
      for (const [key, entry] of memoryStore.entries()) {
        if (entry.expiresAt <= now) {
          memoryStore.delete(key);
          continue;
        }
        if (key.startsWith(prefix)) keys.push(key);
      }
      return keys;
    }
  };
  return redisClient;
}

export const CACHE = {
  TTL: {
    sessionsList: 60,
    sessionDetail: 300,
    subjectsList: 3600,
    teacherProfile: 300,
    studentDashboard: 120,
    parentReport: 600,
    adminDashboard: 120
  },
  sessionsList: (filters) => `sessions:list:${JSON.stringify(filters)}`,
  sessionDetail: (id, scope = "public") => `session:${id}:${scope}`,
  subjectsList: () => "subjects:all",
  teacherProfile: (id) => `teacher:${id}:profile`,
  studentDashboard: (id) => `student:${id}:dashboard`,
  parentReport: (parentId, studentId, month) => `parent:${parentId}:${studentId}:${month}`,
  adminDashboard: () => "admin:dashboard"
};

export async function withCache(key, ttlSeconds, fetchFn) {
  const client = await getRedisClient();
  const cached = await client.get(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const data = await fetchFn();
  await client.setex(key, ttlSeconds, data);
  return data;
}

export async function invalidate(...keys) {
  if (!keys.length) return;
  const client = await getRedisClient();
  await client.del(...keys);
}

export async function invalidatePattern(prefix) {
  const client = await getRedisClient();
  const keys = await client.scanKeys(prefix);
  if (keys.length) await client.del(...keys);
}

export async function invalidateSessionCaches(sessionId) {
  await Promise.all([
    invalidatePattern(`session:${sessionId}:`),
    invalidatePattern("sessions:list:"),
    invalidate(CACHE.adminDashboard())
  ]);
}

export function getCacheMode() {
  if (redisClient && redisMode !== "memory") return redisMode;
  if (isEnabled("FF_REDIS_CACHE_ENABLED") && process.env.UPSTASH_REDIS_REST_URL) {
    return "upstash (pending)";
  }
  if (isEnabled("FF_REDIS_CACHE_ENABLED") && process.env.REDIS_URL) {
    return "ioredis (pending)";
  }
  return "memory";
}
