"use client";

import Link from "next/link";
import { PageLoader } from "@/components/shared/LoadingSkeleton";
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
    return <PageLoader />;
  }

  if (phase === "error") {
    return (
      <div className="space-y-4">
        <Link href="/teacher/sessions" className="text-sm font-bold text-accent">
          العودة لجلساتي
        </Link>
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="space-y-4">
        <EmptyState title="انتهت الجلسة" description="تم إغلاق البث المباشر." />
        <Link href={`/teacher/sessions/${params.id}`} className="mt-4 inline-block text-sm font-bold text-accent">
          عرض ملخص الجلسة
        </Link>
      </div>
    );
  }

  if (phase === "starting") {
    return <PageLoader />;
  }

  if (phase === "live" || phase === "ending") {
    if (!roomUrl || !token) {
      return (
        <div className="space-y-4">
          <EmptyState title="رابط الغرفة غير متاح" description="أعد بدء الجلسة من غرفة الانتظار." />
        </div>
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
