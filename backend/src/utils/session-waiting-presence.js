/** In-memory waiting-room presence (heartbeat TTL 45s). */
const PRESENCE_TTL_MS = 45_000;
const store = new Map();

function presenceKey(sessionId, userId) {
  return `${sessionId}:${userId}`;
}

export function recordWaitingHeartbeat(sessionId, userId) {
  if (!sessionId || !userId) return;
  store.set(presenceKey(sessionId, userId), Date.now());
}

export function isStudentWaitingConnected(sessionId, userId) {
  const ts = store.get(presenceKey(sessionId, userId));
  if (!ts) return false;
  return Date.now() - ts < PRESENCE_TTL_MS;
}

export function pruneWaitingPresence() {
  const now = Date.now();
  for (const [key, ts] of store.entries()) {
    if (now - ts >= PRESENCE_TTL_MS) store.delete(key);
  }
}
