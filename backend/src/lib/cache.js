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
          if (typeof value === "object") return value;
          try {
            return JSON.parse(value);
          } catch {
            try {
              await upstash.del(key);
            } catch {
              /* ignore */
            }
            return null;
          }
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
          if (!value) return null;
          try {
            return JSON.parse(value);
          } catch {
            try {
              await client.del(key);
            } catch {
              /* ignore */
            }
            return null;
          }
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
    teacherDashboard: 120,
    parentReport: 600,
    adminDashboard: 120
  },
  sessionsList: (filters) => `sessions:list:${JSON.stringify(filters)}`,
  sessionDetail: (id, scope = "public") => `session:${id}:${scope}`,
  subjectsList: () => "subjects:all",
  teacherProfile: (id) => `teacher:${id}:profile`,
  studentDashboard: (id) => `student:${id}:dashboard`,
  teacherDashboard: (id) => `teacher:${id}:dashboard`,
  studentSubscription: (id) => `student:${id}:subscription`,
  subscriptionPlans: () => "subscription:plans",
  parentReport: (parentId, studentId, month) => `parent:${parentId}:${studentId}:${month}`,
  adminDashboard: () => "admin:dashboard"
};

export async function getCacheEntry(key) {
  const client = await getRedisClient();
  return client.get(key);
}

export async function setCacheEntry(key, ttlSeconds, value) {
  const client = await getRedisClient();
  await client.setex(key, ttlSeconds, value);
}

export async function withCache(key, ttlSeconds, fetchFn) {
  try {
    const client = await getRedisClient();
    try {
      const cached = await client.get(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    } catch (getErr) {
      console.warn("[cache] get failed:", getErr?.message || getErr);
    }

    const data = await fetchFn();
    try {
      await client.setex(key, ttlSeconds, data);
    } catch (setErr) {
      console.warn("[cache] set failed:", setErr?.message || setErr);
    }
    return data;
  } catch (err) {
    console.warn("[cache] bypass:", err?.message || err);
    return fetchFn();
  }
}

export async function invalidate(...keys) {
  if (!keys.length) return;
  try {
    const client = await getRedisClient();
    await client.del(...keys);
  } catch (err) {
    console.warn("[cache] invalidate:", err?.message || err);
  }
}

export async function invalidatePattern(prefix) {
  try {
    const client = await getRedisClient();
    const keys = await client.scanKeys(prefix);
    if (keys.length) await client.del(...keys);
  } catch (err) {
    console.warn("[cache] invalidatePattern:", err?.message || err);
  }
}

export async function invalidateSessionCaches(sessionId, teacherUserId = null) {
  await Promise.all([
    invalidatePattern(`session:${sessionId}:`),
    invalidatePattern("sessions:list:"),
    invalidatePattern(`teacher:`),
    teacherUserId ? invalidate(CACHE.teacherDashboard(teacherUserId)) : Promise.resolve(),
    invalidate(CACHE.adminDashboard())
  ]);
}

/** Never fail the HTTP handler if Redis/cache is down. */
export async function safeInvalidateSessionCaches(sessionId) {
  try {
    await invalidateSessionCaches(sessionId);
  } catch (err) {
    console.warn("[cache] invalidateSessionCaches:", err?.message || err);
  }
}

/** RULE 7 — student dashboard / sessions after enrollment or payment */
export async function invalidateStudentCaches(studentUserId) {
  if (!studentUserId) return;
  await Promise.all([
    invalidate(CACHE.studentDashboard(studentUserId)),
    invalidatePattern(`student:${studentUserId}:`)
  ]);
}

export async function invalidateTeacherCaches(teacherUserId) {
  if (!teacherUserId) return;
  await Promise.all([
    invalidate(CACHE.teacherDashboard(teacherUserId)),
    invalidatePattern(`teacher:${teacherUserId}:`)
  ]);
}

export async function invalidateSubscriptionCaches(studentUserId) {
  if (!studentUserId) return;
  await invalidate(`student:${studentUserId}:subscription`);
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
