"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { sessionsApi } from "@/lib/api";

const LiveRoom = dynamic(() => import("@/lib/daily"), {
  ssr: false,
  loading: () => <LoadingSkeleton />
});

export default function LiveSessionRoom({ sessionId, isTeacher }) {
  const [roomUrl, setRoomUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const payload = await sessionsApi.getRoom(sessionId);
        if (!cancelled) {
          setRoomUrl(payload?.data?.room_url || "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "تعذر الدخول إلى الجلسة");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <main className="bg-bg p-4 md:p-6">
        <EmptyState title={error} />
      </main>
    );
  }
  if (!roomUrl) {
    return (
      <main className="bg-bg p-4 md:p-6">
        <EmptyState title="رابط الغرفة غير متاح" />
      </main>
    );
  }

  return <LiveRoom roomUrl={roomUrl} isTeacher={isTeacher} />;
}
