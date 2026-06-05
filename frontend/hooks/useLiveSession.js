"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logApiError, sessionsApi } from "@/lib/api";
import { getStartAvailability, isLiveSession } from "@/lib/teacher-sessions";
import { mapSessionForLive } from "@/lib/live-session";

/**
 * @typedef {'loading'|'waiting'|'starting'|'live'|'ending'|'ended'|'error'} LiveSessionPhase
 */

export function useLiveSession(sessionId) {
  const router = useRouter();
  const [phase, setPhase] = useState("loading");
  const [session, setSession] = useState(null);
  const [roomUrl, setRoomUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const liveRef = useRef(false);

  const loadSession = useCallback(async () => {
    setError("");
    try {
      const res = await sessionsApi.get(sessionId);
      const raw = res?.data;
      if (!raw) throw new Error("الجلسة غير موجودة");
      const mapped = mapSessionForLive(raw);
      setSession(mapped);

      if (mapped.status === "completed" || mapped.status === "cancelled") {
        setPhase("ended");
        return mapped;
      }

      if (isLiveSession(raw)) {
        liveRef.current = true;
        const roomRes = await sessionsApi.getRoom(sessionId);
        const joinRes = await sessionsApi.join(sessionId).catch(() => null);
        const url = joinRes?.data?.room_url || roomRes?.data?.room_url || "";
        const meetingToken = joinRes?.data?.token || roomRes?.data?.token || "";
        if (url && meetingToken) {
          setRoomUrl(url);
          setToken(meetingToken);
          setStartedAt(Date.now());
          setPhase("live");
        } else {
          setPhase("waiting");
        }
      } else {
        liveRef.current = false;
        setPhase("waiting");
      }
      return mapped;
    } catch (err) {
      logApiError("teacher/live/load", err);
      setError(err.message || "تعذر تحميل الجلسة");
      setPhase("error");
      return null;
    }
  }, [sessionId]);

  useEffect(() => {
    setPhase("loading");
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (liveRef.current && phase === "live") {
        e.preventDefault();
        e.returnValue = "الجلسة شغالة — هتخرج؟";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase]);

  const startSession = useCallback(async () => {
    if (!session) return null;
    const startInfo = getStartAvailability({ status: "scheduled", scheduled_at: session.scheduledAt });
    if (!startInfo.canStart) {
      throw new Error(startInfo.reason || "لا يمكن بدء الجلسة الآن");
    }

    setPhase("starting");
    try {
      const res = await sessionsApi.start(sessionId);
      const url = res?.data?.room_url || "";
      const joinRes = await sessionsApi.join(sessionId);
      const meetingToken = joinRes?.data?.token || "";
      if (!url || !meetingToken) {
        throw new Error("تم بدء الجلسة لكن رابط الغرفة غير متاح. راجع إعدادات LiveKit");
      }
      setRoomUrl(url);
      setToken(meetingToken);
      setStartedAt(Date.now());
      liveRef.current = true;
      setSession((prev) => (prev ? { ...prev, status: "live" } : prev));
      setPhase("live");
      return { room_url: url, room_warning: res?.data?.room_warning };
    } catch (err) {
      logApiError("teacher/live/start", err);
      setPhase("waiting");
      throw err;
    }
  }, [session, sessionId]);

  const endSession = useCallback(async () => {
    setPhase("ending");
    try {
      await sessionsApi.end(sessionId);
      liveRef.current = false;
      setPhase("ended");
      router.replace(`/teacher/sessions/${sessionId}`);
    } catch (err) {
      logApiError("teacher/live/end", err);
      setPhase("live");
      throw err;
    }
  }, [router, sessionId]);

  return {
    phase,
    session,
    roomUrl,
    token,
    error,
    startedAt,
    isOffline,
    reload: loadSession,
    startSession,
    endSession
  };
}
