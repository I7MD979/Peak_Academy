const channels = new Map();

function subscribe(userId, res) {
  const key = String(userId);
  if (!channels.has(key)) channels.set(key, new Set());
  channels.get(key).add(res);
}

function unsubscribe(userId, res) {
  const key = String(userId);
  const set = channels.get(key);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) channels.delete(key);
}

function publish(userId, payload) {
  const key = String(userId);
  const listeners = channels.get(key);
  if (!listeners || listeners.size === 0) return;
  const frame = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of listeners) {
    res.write(frame);
  }
}

module.exports = { subscribe, unsubscribe, publish };
