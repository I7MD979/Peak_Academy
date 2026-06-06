"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageLoader } from "@/components/shared/LoadingSkeleton";
import TeacherSessionDetailView from "@/components/teacher/TeacherSessionDetailPage";
import { logApiError, sessionsApi } from "@/lib/api";
import { getStartAvailability } from "@/lib/teacher-session-detail";

export default function TeacherSessionDetailRoute({ params }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sessionRes, enrollRes] = await Promise.all([
        sessionsApi.get(params.id),
        sessionsApi.getEnrollments(params.id)
      ]);
      setSession(sessionRes?.data || null);
      setEnrollments(enrollRes?.data?.enrollments || []);
    } catch (err) {
      logApiError("teacher/session/detail", err);
      setSession(null);
      setEnrollments([]);
      setError(err.message || "تعذر تحميل الجلسة");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    const startInfo = getStartAvailability(session);
    if (!startInfo.canStart) {
      toast.error(startInfo.reason || "لا يمكن بدء الجلسة الآن");
      return;
    }
    try {
      setActionId("start");
      const res = await sessionsApi.start(params.id);
      const roomUrl = res?.data?.room_url;
      if (res?.data?.room_warning) toast.warning(res.data.room_warning);
      toast.success("تم بدء الجلسة");
      await load();
      if (roomUrl) window.open(roomUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      logApiError("teacher/session/start", err);
      toast.error(err.message || "تعذر بدء الجلسة");
    } finally {
      setActionId("");
    }
  };

  const handleEnd = async () => {
    const confirmed = window.confirm("هل تريد إنهاء الجلسة؟ سيتم تسجيل الحضور وحساب الأرباح.");
    if (!confirmed) return;
    try {
      setActionId("end");
      await sessionsApi.end(params.id);
      toast.success("تم إنهاء الجلسة وحساب الأرباح");
      await load();
    } catch (err) {
      logApiError("teacher/session/end", err);
      toast.error(err.message || "تعذر إنهاء الجلسة");
    } finally {
      setActionId("");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <TeacherSessionDetailView
      session={session}
      enrollments={enrollments}
      error={error}
      actionId={actionId}
      onReload={load}
      onStart={handleStart}
      onEnd={handleEnd}
      onEnterLive={() => router.push(`/teacher/live/${session.id}`)}
    />
  );
}
