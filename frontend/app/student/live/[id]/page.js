"use client";

import { useEffect, useState } from "react";
import LiveSessionRoom from "@/components/shared/LiveSessionRoom";
import StudentWaitingRoom from "@/components/student/StudentWaitingRoom";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import { studentApi } from "@/lib/api";

export default function StudentLivePage({ params }) {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await studentApi.session(params.id);
        const st = String(res?.data?.status || "").toLowerCase();
        if (!cancelled) setStatus(st === "live" ? "live" : "waiting");
      } catch {
        if (!cancelled) setStatus("waiting");
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [params.id]);

  if (status === "loading") {
    return (
      <main className="p-4">
        <LoadingSkeleton />
      </main>
    );
  }

  if (status === "waiting") {
    return <StudentWaitingRoom sessionId={params.id} />;
  }

  return <LiveSessionRoom sessionId={params.id} isTeacher={false} />;
}
