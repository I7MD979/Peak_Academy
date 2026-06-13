"use client";

import { useCallback, useEffect, useState } from "react";
import TeacherDashboardView from "@/components/teacher/TeacherDashboardPage";
import { logApiError, sessionsApi, teacherApi, accountApi } from "@/lib/api";
import { getStartAvailability } from "@/lib/teacher-sessions";

export default function TeacherDashboardClient({ initialData = null, initialVerification = null }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");

  const [verificationRejectReason, setVerificationRejectReason] = useState(() => {
    const docs = initialVerification?.documents || [];
    const rejected = docs.find((d) => d.status === "rejected");
    return rejected?.reject_reason || "";
  });

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else if (!data) setLoading(true);
    setError("");

    try {
      const [res, verRes] = await Promise.all([
        teacherApi.dashboard(),
        accountApi.verificationStatus().catch(() => null)
      ]);
      const verStatus = verRes?.data?.verification_status;
      setData({
        ...(res?.data || null),
        profile: res?.data?.profile
          ? {
              ...res.data.profile,
              verification_status: verStatus || res.data.profile.verification_status || "unverified",
            }
          : res?.data?.profile,
      });
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
  }, [data]);

  useEffect(() => {
    if (initialData) return;
    loadDashboard();
  }, [initialData, loadDashboard]);

  const upcomingSessions = data?.upcoming_sessions || [];
  const recentCompleted = data?.recent_completed || [];

  const handleStartSession = async (sessionId) => {
    const session = upcomingSessions.find((item) => item.id === sessionId);
    const startInfo = session
      ? getStartAvailability(session, data?.profile?.verification_status)
      : { canStart: true };

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
      profile={
        data?.profile
          ? {
              ...data.profile,
              verification_status:
                initialVerification?.verification_status ??
                data.profile.verification_status ??
                "unverified",
            }
          : null
      }
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
