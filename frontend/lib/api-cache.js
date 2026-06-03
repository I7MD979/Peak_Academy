/** طلبات متزامنة + طابور + تخزين مؤقت لتقليل 429 أثناء التطوير */

const isDev = process.env.NODE_ENV !== "production";
const GET_TTL_MS = isDev ? 60_000 : 8_000;
const ERROR_TTL_MS = 15_000;
const MAX_CONCURRENT = isDev ? 4 : 8;

const inflight = new Map();
const getCache = new Map();
const errorCache = new Map();

let activeCount = 0;
const waitQueue = [];

function buildKey(method, path, body) {
  return `${method}:${path}:${body || ""}`;
}

function runQueued(task) {
  return new Promise((resolve, reject) => {
    const run = async () => {
      activeCount += 1;
      try {
        resolve(await task());
      } catch (err) {
        reject(err);
      } finally {
        activeCount -= 1;
        const next = waitQueue.shift();
        if (next) next();
      }
    };

    if (activeCount < MAX_CONCURRENT) {
      run();
    } else {
      waitQueue.push(run);
    }
  });
}

function cacheError(key, err) {
  errorCache.set(key, { at: Date.now(), err });
}

function getCachedError(key) {
  const hit = errorCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ERROR_TTL_MS) {
    errorCache.delete(key);
    return null;
  }
  return hit.err;
}

export function clearApiCache(prefix = "") {
  if (!prefix) {
    inflight.clear();
    getCache.clear();
    errorCache.clear();
    return;
  }
  for (const key of [...getCache.keys()]) {
    if (key.includes(prefix)) getCache.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.includes(prefix)) inflight.delete(key);
  }
  for (const key of [...errorCache.keys()]) {
    if (key.includes(prefix)) errorCache.delete(key);
  }
}

function wrapFetch(key, method, performFetch) {
  const cachedErr = getCachedError(key);
  if (cachedErr) {
    return Promise.reject(cachedErr);
  }

  if (method === "GET") {
    const hit = getCache.get(key);
    if (hit && Date.now() - hit.at < GET_TTL_MS) {
      return Promise.resolve(hit.data);
    }
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = runQueued(() =>
    performFetch()
      .then((data) => {
        if (method === "GET") {
          getCache.set(key, { at: Date.now(), data });
        }
        errorCache.delete(key);
        return data;
      })
      .catch((err) => {
        if (err?.status === 429) {
          cacheError(key, err);
        }
        throw err;
      })
  )
    .finally(() => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * جلب /auth/me مرة واحدة مع مشاركة النتيجة بين الشريط والصفحات
 */
export function fetchAuthMe(fetcher) {
  const key = buildKey("GET", "/auth/me", "");
  return wrapFetch(key, "GET", fetcher);
}

export async function cachedApiRequest(path, options = {}, tokenOverride = null, performFetch) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body || "";
  const key = buildKey(method, path, body);
  return wrapFetch(key, method, performFetch);
}
