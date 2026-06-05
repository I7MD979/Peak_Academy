"use client";

import { useEffect, useState } from "react";
import { studentApi } from "@/lib/api";
import { useWaitingHeartbeat } from "@/hooks/useWaitingHeartbeat";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

export default function StudentWaitingRoom({ sessionId }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useWaitingHeartbeat(sessionId, true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await studentApi.session(sessionId).catch(() => null);
        if (!cancelled) setSession(res?.data || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const id = setInterval(async () => {
      try {
        const res = await studentApi.session(sessionId).catch(() => null);
        if (!cancelled && String(res?.data?.status || "").toLowerCase() === "live") {
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    }, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId]);

  if (loading) return <LoadingSkeleton />;

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="h-12 w-12 animate-pulse rounded-full bg-accent/20" />
      <h1 className="text-xl font-black text-primary">في انتظار بدء الحصة</h1>
      <p className="max-w-md text-sm text-text-muted">
        {session?.title ? `«${session.title}»` : "الجلسة"} — المدرس لم يبدأ البث بعد. ستُفتح الغرفة تلقائياً عند البدء.
      </p>
      <p className="text-xs text-success">✓ تم تسجيل حضورك في غرفة الانتظار</p>
    </main>
  );
}
