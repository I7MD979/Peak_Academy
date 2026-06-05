"use client";

import Link from "next/link";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import WaitingRoom from "@/components/teacher/live/WaitingRoom";
import LiveBroadcast from "@/components/teacher/live/LiveBroadcast";
import { useLiveSession } from "@/hooks/useLiveSession";

export default function TeacherLivePage({ params }) {
  const {
    phase,
    session,
    roomUrl,
    token,
    error,
    startedAt,
    isOffline,
    reload,
    startSession,
    endSession
  } = useLiveSession(params.id);

  if (phase === "loading") {
    return (
      <main className="p-4 md:p-6">
        <LoadingSkeleton />
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="space-y-4 p-4 md:p-6">
        <Link href="/teacher/sessions" className="text-sm font-bold text-accent">
          العودة لجلساتي
        </Link>
        <ErrorState message={error} onRetry={reload} />
      </main>
    );
  }

  if (phase === "ended") {
    return (
      <main className="p-4 md:p-6">
        <EmptyState title="انتهت الجلسة" description="تم إغلاق البث المباشر." />
        <Link href={`/teacher/sessions/${params.id}`} className="mt-4 inline-block text-sm font-bold text-accent">
          عرض ملخص الجلسة
        </Link>
      </main>
    );
  }

  if (phase === "starting") {
    return (
      <main className="p-4 md:p-6">
        <LoadingSkeleton />
      </main>
    );
  }

  if (phase === "live" || phase === "ending") {
    if (!roomUrl || !token) {
      return (
        <main className="p-4 md:p-6">
          <EmptyState title="رابط الغرفة غير متاح" description="أعد بدء الجلسة من غرفة الانتظار." />
        </main>
      );
    }

    return (
      <LiveBroadcast
        session={session}
        sessionId={params.id}
        roomUrl={roomUrl}
        token={token}
        startedAt={startedAt}
        isOffline={isOffline}
        ending={phase === "ending"}
        onEnd={endSession}
      />
    );
  }

  return (
    <WaitingRoom session={session} sessionId={params.id} onStart={startSession} />
  );
}
