"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { studyRoomsApi } from "@/lib/api";

/**
 * Manages real-time chat for a study room (unified feed).
 *
 * @param {string} roomId
 */
export function useRoomChat(roomId) {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState(null);
  const [hasMore, setHasMore]     = useState(true);
  const channelRef                = useRef(null);

  // ── Initial load ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await studyRoomsApi.getMessages(roomId, { limit: 50 });
      setMessages(res.data?.messages ?? []);
      setHasMore((res.data?.messages ?? []).length === 50);
    } catch (err) {
      setError(err.message || "تعذر تحميل الرسائل");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // ── Load older messages (pagination) ──────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || messages.length === 0) return;
    const oldest = messages[0]?.created_at;
    try {
      const res = await studyRoomsApi.getMessages(roomId, {
        limit: 50,
        before: oldest
      });
      const older = res.data?.messages ?? [];
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length === 50);
    } catch {
      // silent — user can retry by scrolling again
    }
  }, [roomId, messages, hasMore, loading]);

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (body) => {
      setSending(true);
      try {
        const res = await studyRoomsApi.sendMessage(roomId, body);
        // Realtime will push it back, but optimistically append if RLS blocks realtime
        return res.data?.message ?? null;
      } catch (err) {
        throw err;
      } finally {
        setSending(false);
      }
    },
    [roomId]
  );

  const resolveQuestion = useCallback(
    async (messageId) => {
      await studyRoomsApi.resolveQuestion(roomId, messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_resolved: true } : m))
      );
    },
    [roomId]
  );

  // ── Supabase Realtime subscription ────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    load();

    const supabase = createClient();
    const sub = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "study_room_messages",
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const msg = payload.new;
          setMessages((prev) => {
            // Deduplicate by id
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "study_room_messages",
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const updated = payload.new;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .subscribe();

    channelRef.current = sub;

    return () => {
      supabase.removeChannel(sub);
    };
  }, [roomId, load]);

  return {
    messages,
    loading,
    sending,
    error,
    hasMore,
    sendMessage,
    resolveQuestion,
    loadMore,
    reload: load
  };
}
