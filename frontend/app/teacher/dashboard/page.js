"use client";

import { useCallback, useEffect, useState } from "react";
import TeacherDashboardView from "@/components/teacher/TeacherDashboardPage";
import { logApiError, sessionsApi, teacherApi, accountApi } from "@/lib/api";
import { getStartAvailability } from "@/lib/teacher-sessions";

export default function TeacherDashboardRoutePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");

  const [verificationRejectReason, setVerificationRejectReason] = useState("");

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [res, verRes] = await Promise.all([
        teacherApi.dashboard(),
        accountApi.verificationStatus().catch(() => null)
      ]);
      setData(res?.data || null);
      const docs = verRes?.data?.documents || [];
      const rejected = docs.find((d) => d.status === "rejected");
      setVerificationRejectReason(rejected?.reject_reason || "");
    } catch (err) {
      logApiError("teacher/dashboard", err);
      if (!silent) setData(null);
      setError(err.message || "تعذر تحميل لوحة المعلم");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const upcomingSessions = data?.upcoming_sessions || [];
  const recentCompleted = data?.recent_completed || [];

  const handleStartSession = async (sessionId) => {
    const session = upcomingSessions.find((item) => item.id === sessionId);
    const startInfo = session ? getStartAvailability(session) : { canStart: true };

    if (!startInfo.canStart) {
      setError(startInfo.reason || "لا يمكن بدء الجلسة الآن");
      return;
    }

    try {
      setActionLoadingId(`start-${sessionId}`);
      const res = await sessionsApi.start(sessionId);
      const roomUrl = res?.data?.room_url;

      if (roomUrl) {
        window.open(roomUrl, "_blank", "noopener,noreferrer");
      }

      if (res?.data?.room_warning) {
        setError(res.data.room_warning);
      }

      await loadDashboard({ silent: true });
    } catch (err) {
      logApiError("teacher/dashboard/start", err);
      setError(err.message || "تعذر بدء الجلسة");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleEndSession = async (sessionId) => {
    try {
      setActionLoadingId(`end-${sessionId}`);
      await sessionsApi.end(sessionId);
      await loadDashboard({ silent: true });
    } catch (err) {
      logApiError("teacher/dashboard/end", err);
      setError(err.message || "تعذر إنهاء الجلسة");
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <TeacherDashboardView
      profile={data?.profile}
      stats={data?.stats}
      upcomingSessions={upcomingSessions}
      recentCompleted={recentCompleted}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={() => loadDashboard({ silent: true })}
      actionLoadingId={actionLoadingId}
      onStartSession={handleStartSession}
      onEndSession={handleEndSession}
      verificationRejectReason={verificationRejectReason}
    />
  );
}
