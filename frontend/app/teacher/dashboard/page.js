"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/shared/StatsCard";
import DataTable from "@/components/admin/DataTable";
import { dashboardApi, sessionsApi } from "@/lib/api";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import { getStartAvailability } from "@/lib/teacher-sessions";

export default function TeacherDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, sessionsRes, summaryRes] = await Promise.all([
        dashboardApi.myProfile(),
        sessionsApi.list("status=all&limit=100"),
        dashboardApi.teacherEarningsSummary()
      ]);
      setProfile(profileRes?.data || null);
      setSessions(sessionsRes?.data || []);
      setEarningsSummary(summaryRes?.data || null);
    } catch (err) {
      setError(err.message || "تعذر تحميل لوحة المعلم");
      setProfile(null);
      setSessions([]);
      setEarningsSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const scheduledCount = useMemo(
    () => sessions.filter((s) => s.status === "scheduled").length,
    [sessions]
  );
  const liveCount = useMemo(() => sessions.filter((s) => s.status === "live").length, [sessions]);
  const completedCount = useMemo(
    () => sessions.filter((s) => s.status === "completed").length,
    [sessions]
  );
  const totalEarnings = earningsSummary?.total_earnings ?? 0;

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((s) => s.status === "scheduled" && new Date(s.scheduled_at).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 6);
  }, [sessions]);

  const recentCompleted = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "completed")
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
        .slice(0, 5),
    [sessions]
  );

  const handleStartSession = async (sessionId) => {
    const session = sessions.find((s) => s.id === sessionId);
    const startInfo = session ? getStartAvailability(session) : { canStart: true };
    if (!startInfo.canStart) {
      setError(startInfo.reason || "لا يمكن بدء الجلسة الآن");
      return;
    }

    try {
      setActionLoadingId(`start-${sessionId}`);
      await sessionsApi.start(sessionId);
      await loadDashboard();
    } catch (err) {
      setError(err.message || "تعذر بدء الجلسة");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleEndSession = async (sessionId) => {
    try {
      setActionLoadingId(`end-${sessionId}`);
      await sessionsApi.end(sessionId);
      await loadDashboard();
    } catch (err) {
      setError(err.message || "تعذر إنهاء الجلسة");
    } finally {
      setActionLoadingId("");
    }
  };

  const columns = [
    {
      key: "title",
      label: "الجلسة",
      render: (row) => <span className="font-semibold text-text">{row.title || "جلسة بدون عنوان"}</span>
    },
    {
      key: "scheduled_at",
      label: "الموعد",
      render: (row) => formatDateTimeAr(row.scheduled_at)
    },
    {
      key: "status",
      label: "الحالة",
      render: (row) =>
        row.status === "live" ? "مباشرة" : row.status === "scheduled" ? "مجدولة" : "منتهية"
    },
    {
      key: "actions",
      label: "إجراء",
      render: (row) => {
        if (row.status === "live") {
          return (
            <Button
              type="button"
              size="sm"
              disabled={actionLoadingId === `end-${row.id}`}
              onClick={() => handleEndSession(row.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {actionLoadingId === `end-${row.id}` ? "جارٍ..." : "إنهاء"}
            </Button>
          );
        }
        const startInfo = getStartAvailability(row);
        return (
          <Button
            type="button"
            size="sm"
            disabled={!startInfo.canStart || actionLoadingId === `start-${row.id}`}
            title={startInfo.reason || undefined}
            onClick={() => handleStartSession(row.id)}
          >
            {actionLoadingId === `start-${row.id}` ? "جارٍ..." : "بدء"}
          </Button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-2xl border border-border bg-gradient-to-l from-primary/5 via-card to-accent/5 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold text-accent">لوحة المعلم</p>
            <h2 className="mt-1 text-2xl font-black text-primary">
              أهلاً {profile?.full_name ? profile.full_name.split(" ")[0] : "بك"}
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              متابعة الجلسات، إدارة الوقت، ومراجعة أرباحك من مكان واحد.
            </p>
          </div>
          <div className="flex gap-2">
            <Button href="/teacher/sessions/new">إنشاء جلسة جديدة</Button>
            <Button type="button" variant="outline" onClick={loadDashboard} disabled={loading}>
              تحديث
            </Button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="جلسات مجدولة" value={loading ? "..." : scheduledCount.toLocaleString("ar-EG")} />
        <StatsCard title="جلسات مباشرة" value={loading ? "..." : liveCount.toLocaleString("ar-EG")} />
        <StatsCard title="جلسات مكتملة" value={loading ? "..." : completedCount.toLocaleString("ar-EG")} />
        <StatsCard title="إجمالي الأرباح" value={loading ? "..." : formatCurrencyEgp(totalEarnings)} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-text">الجلسات القادمة</h3>
        <DataTable
          columns={columns}
          data={upcomingSessions.map((row) => ({ ...row, _key: `upcoming-${row.id}` }))}
          loading={loading}
          emptyMessage="لا توجد جلسات قادمة"
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-text">آخر الجلسات المكتملة</h3>
        <DataTable
          columns={[
            { key: "title", label: "الجلسة" },
            { key: "scheduled_at", label: "الموعد", render: (row) => formatDateTimeAr(row.scheduled_at) }
          ]}
          data={recentCompleted.map((row) => ({ ...row, _key: `done-${row.id}` }))}
          loading={loading}
          emptyMessage="لا توجد جلسات مكتملة بعد"
        />
      </section>
    </div>
  );
}
