const channels = new Map();

export function subscribe(userId, res) {
  const key = String(userId);
  if (!channels.has(key)) channels.set(key, new Set());
  channels.get(key).add(res);
}

export function unsubscribe(userId, res) {
  const key = String(userId);
  const set = channels.get(key);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) channels.delete(key);
}

function deliver(userId, payload) {
  const key = String(userId);
  const listeners = channels.get(key);
  if (!listeners || listeners.size === 0) return;
  const frame = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of listeners) {
    res.write(frame);
  }
}

export function publish(userId, payload) {
  deliver(userId, payload);
}

export function publishNotification(userId, payload) {
  deliver(userId, payload);
}
