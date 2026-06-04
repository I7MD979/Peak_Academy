"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { notificationsApi } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/api$/, "");

function parseSseBlocks(buffer) {
  const events = [];
  const blocks = buffer.split("\n\n");
  const remainder = blocks.pop() || "";

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    let eventName = "message";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }

    if (data) {
      events.push({ eventName, data });
    }
  }

  return { events, remainder };
}

export function useNotifications() {
  const session = useAuthStore((s) => s.session);
  const token = session?.access_token;
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const streamAbortRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.unreadCount()
      ]);
      setItems(listRes?.data || []);
      setUnreadCount(countRes?.data?.count ?? 0);
      setError("");
    } catch (err) {
      setError(err.message || "تعذر تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    const controller = new AbortController();
    streamAbortRef.current = controller;

    async function connectStream() {
      try {
        const res = await fetch(`${API_BASE}/api/notifications/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });

        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (active) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { events, remainder } = parseSseBlocks(buffer);
          buffer = remainder;

          for (const { eventName, data } of events) {
            if (eventName !== "notification") continue;
            try {
              const payload = JSON.parse(data);
              setItems((prev) => {
                const exists = prev.some((n) => n.id === payload.id);
                if (exists) return prev;
                return [payload, ...prev];
              });
              setUnreadCount((c) => c + 1);
              toast.info(payload.title, { description: payload.body || undefined });
            } catch {
              /* ignore malformed event */
            }
          }
        }
      } catch (err) {
        if (err?.name !== "AbortError" && active) {
          /* fall back to polling */
        }
      }
    }

    connectStream();
    const poll = setInterval(refresh, 120_000);

    return () => {
      active = false;
      controller.abort();
      streamAbortRef.current = null;
      clearInterval(poll);
    };
  }, [token, refresh]);

  const markRead = useCallback(async (id) => {
    await notificationsApi.markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  return {
    items,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead
  };
}
