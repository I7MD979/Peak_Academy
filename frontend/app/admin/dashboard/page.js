"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminUserDetailsModal from "@/components/admin/AdminUserDetailsModal";
import SessionDetailsModal from "@/components/admin/SessionDetailsModal";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminDashboardView from "@/components/admin/AdminDashboardPage";
import { useAuth } from "@/hooks/useAuth";
import { dashboardApi, sessionsApi } from "@/lib/api";
import {
  formatCurrencyEgp,
  formatDateAr,
  formatDateTimeAr,
  formatGradeAr,
  formatSchoolLevelAr
} from "@/lib/format";
import { ROLE_LABELS_AR } from "@/lib/profile-form";
import { cn } from "@/lib/utils";
import { useSidebarProfile } from "@/hooks/useSidebarProfile";

const roleBadgeClass = {
  student: "bg-accent-blue/10 text-accent-blue",
  teacher: "bg-accent/10 text-accent",
  parent: "bg-secondary-container/30 text-secondary",
  admin: "bg-primary-container/20 text-md-primary"
};

function RoleBadge({ role }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold",
        roleBadgeClass[role] || "bg-surface-container-highest text-on-surface-variant"
      )}
    >
      {ROLE_LABELS_AR[role] || role || "—"}
    </span>
  );
}

function getEnrollmentCount(session) {
  return session?.enrollments?.[0]?.count ?? session?.enrollment_count ?? 0;
}

function canCancelSession(session) {
  return session?.status === "scheduled" || session?.status === "live";
}

function canModifyUser(user, currentUserId) {
  if (!user) return false;
  if (user.id === currentUserId) return false;
  if (user.role === "admin") return false;
  return true;
}

export default function AdminDashboardPage() {
  const profile = useSidebarProfile();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id || "";

  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState("6months");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mutatingId, setMutatingId] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await dashboardApi.adminDashboard();
      const payload = res?.data || {};
      setStats(payload.stats || null);
      setRecentUsers(payload.recent_users || []);
      setRecentSessions(payload.recent_sessions || []);
    } catch (err) {
      setStats(null);
      setRecentUsers([]);
      setRecentSessions([]);
      setError(err.message || "تعذر تحميل بيانات لوحة التحكم. تأكد أن الخادم يعمل.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChart = useCallback(async () => {
    setChartLoading(true);
    try {
      const res = await dashboardApi.adminReports(chartPeriod);
      setChartData(res?.data?.monthly_revenue || []);
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [chartPeriod]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadDashboard(), loadChart()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboard, loadChart]);

  const patchUser = useCallback((userId, patch) => {
    setRecentUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
    setSelectedUser((prev) => (prev?.id === userId ? { ...prev, ...patch } : prev));
  }, []);

  const handleVerify = async (user) => {
    if (user.role !== "teacher" || user.is_verified === true) return;
    setMutatingId(user.id);
    try {
      await dashboardApi.adminVerifyUser(user.id);
      patchUser(user.id, { is_verified: true });
      toast.success("تم توثيق المدرس بنجاح");
      setConfirmAction(null);
    } catch (err) {
      toast.error(err.message || "فشل توثيق المدرس");
    } finally {
      setMutatingId("");
    }
  };

  const executeSuspendToggle = async (user) => {
    if (!canModifyUser(user, currentUserId)) {
      toast.error("لا يمكن تنفيذ هذا الإجراء على هذا الحساب");
      return;
    }

    const isSuspended = user.is_active === false;
    setMutatingId(user.id);
    const updater = isSuspended ? dashboardApi.adminActivateUser : dashboardApi.adminSuspendUser;

    try {
      await updater(user.id);
      patchUser(user.id, { is_active: isSuspended });
      toast.success(isSuspended ? "تم تفعيل الحساب بنجاح" : "تم تعليق الحساب بنجاح");
    } catch (err) {
      toast.error(err.message || "فشل تحديث حالة الحساب");
    } finally {
      setMutatingId("");
      setConfirmAction(null);
    }
  };

  const handleCancelSession = async (session) => {
    setMutatingId(session.id);
    try {
      await sessionsApi.cancel(session.id);
      setRecentSessions((prev) => prev.filter((s) => s.id !== session.id));
      setSelectedSession((prev) => (prev?.id === session.id ? null : prev));
      toast.success("تم إلغاء الجلسة بنجاح");
      setCancelTarget(null);
      await loadDashboard();
    } catch (err) {
      toast.error(err.message || "فشل إلغاء الجلسة");
    } finally {
      setMutatingId("");
    }
  };

  const sessionColumns = useMemo(
    () => [
      {
        key: "title",
        label: "الجلسة",
        render: (row) => (
          <button type="button" className="min-w-[160px] text-start" onClick={() => setSelectedSession(row)}>
            <p className="font-bold text-on-surface hover:text-md-primary">{row.title}</p>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {row.subject?.icon ? `${row.subject.icon} ` : ""}
              {row.subject?.name_ar || row.subject || "مادة عامة"}
            </p>
          </button>
        )
      },
      {
        key: "teacher",
        label: "المدرس",
        render: (row) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-primary/15 text-xs font-black text-md-primary">
              {(row.teacher?.full_name || "?").slice(0, 1)}
            </div>
            <span className="text-on-surface">{row.teacher?.full_name || "—"}</span>
          </div>
        )
      },
      {
        key: "level",
        label: "المرحلة",
        render: (row) => (
          <div className="text-xs">
            <p className="font-bold text-on-surface">{formatSchoolLevelAr(row.school_level)}</p>
            <p className="text-on-surface-variant">{formatGradeAr(row.grade)}</p>
          </div>
        )
      },
      {
        key: "scheduled_at",
        label: "الموعد",
        render: (row) => <span className="text-on-surface">{formatDateTimeAr(row.scheduled_at)}</span>
      },
      {
        key: "students",
        label: "الطلاب",
        render: (row) => {
          const enrolled = getEnrollmentCount(row);
          const max = row.max_students || 0;
          return (
            <span className={cn("font-bold", max > 0 && enrolled >= max ? "text-danger" : "text-on-surface")}>
              {enrolled}/{max || "—"}
            </span>
          );
        }
      },
      {
        key: "price",
        label: "السعر",
        render: (row) => (
          <span className="font-bold text-md-primary">{formatCurrencyEgp(row.price_per_student)}</span>
        )
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.status || "scheduled"} variant="session" />
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => {
          const busy = mutatingId === row.id;
          const cancellable = canCancelSession(row);

          const items = [
            {
              label: "عرض التفاصيل",
              icon: "video",
              onClick: () => setSelectedSession(row)
            },
            {
              label: "صفحة الجلسات",
              icon: "arrowRight",
              onClick: () => window.open("/admin/sessions", "_self")
            },
            cancellable
              ? {
                  label: "إلغاء الجلسة",
                  icon: "close",
                  tone: "danger",
                  disabled: busy,
                  onClick: () => setCancelTarget(row)
                }
              : null
          ].filter(Boolean);

          return <AdminActionsMenu items={items} disabled={busy} label={busy ? "جاري..." : "إجراءات"} />;
        }
      }
    ],
    [mutatingId]
  );

  const userColumns = useMemo(
    () => [
      {
        key: "full_name",
        label: "المستخدم",
        render: (row) => (
          <button
            type="button"
            className="flex w-full items-center gap-3 text-start"
            onClick={() => setSelectedUser(row)}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-md-primary/15 text-sm font-black text-md-primary">
              {row.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (row.full_name || "?").slice(0, 1)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-on-surface">{row.full_name || "—"}</p>
              <p className="truncate text-xs text-on-surface-variant" dir="ltr">
                {row.email || "—"}
              </p>
            </div>
          </button>
        )
      },
      { key: "role", label: "الدور", render: (row) => <RoleBadge role={row.role} /> },
      { key: "created_at", label: "التسجيل", render: (row) => formatDateAr(row.created_at) },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.is_active === false ? "suspended" : "active"} />
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => {
          const busy = mutatingId === row.id;
          const canVerify = row.role === "teacher" && row.is_verified !== true;
          const modifiable = canModifyUser(row, currentUserId);

          const items = [
            {
              label: "عرض الملف",
              icon: "user",
              onClick: () => setSelectedUser(row)
            },
            {
              label: "صفحة المستخدمين",
              icon: "arrowRight",
              onClick: () => window.open("/admin/users", "_self")
            },
            canVerify
              ? {
                  label: "توثيق المدرس",
                  icon: "check",
                  tone: "primary",
                  disabled: busy,
                  onClick: () => setConfirmAction({ type: "verify", user: row })
                }
              : null,
            modifiable
              ? {
                  label: row.is_active === false ? "تفعيل الحساب" : "تعليق الحساب",
                  icon: row.is_active === false ? "unlock" : "lock",
                  tone: row.is_active === false ? "success" : "danger",
                  disabled: busy,
                  onClick: () => setConfirmAction({ type: "suspend", user: row })
                }
              : null
          ].filter(Boolean);

          return <AdminActionsMenu items={items} disabled={busy} label={busy ? "جاري..." : "إجراءات"} />;
        }
      }
    ],
    [currentUserId, mutatingId]
  );

  const confirmUser = confirmAction?.user;
  const confirmType = confirmAction?.type;
  const isSuspend = confirmType === "suspend" && confirmUser?.is_active !== false;
  const isVerify = confirmType === "verify";

  return (
    <>
      <AdminDashboardView
        adminName={profile.full_name || "مشرف"}
        stats={stats}
        recentUsers={recentUsers}
        recentSessions={recentSessions}
        chartData={chartData}
        chartPeriod={chartPeriod}
        onChartPeriodChange={setChartPeriod}
        userColumns={userColumns}
        sessionColumns={sessionColumns}
        loading={loading}
        chartLoading={chartLoading}
        refreshing={refreshing}
        error={error}
        onRefresh={refreshAll}
      />

      <AdminUserDetailsModal
        user={selectedUser}
        busy={mutatingId === selectedUser?.id}
        currentUserId={currentUserId}
        onClose={() => setSelectedUser(null)}
        onVerify={(user) => setConfirmAction({ type: "verify", user })}
        onSuspendToggle={(user) => setConfirmAction({ type: "suspend", user })}
      />

      <SessionDetailsModal
        session={selectedSession}
        busy={mutatingId === selectedSession?.id}
        canCancel={canCancelSession(selectedSession)}
        onClose={() => setSelectedSession(null)}
        onCancel={(session) => setCancelTarget(session)}
      />

      <AdminConfirmDialog
        open={Boolean(cancelTarget)}
        title="إلغاء الجلسة"
        description={`هل تريد إلغاء جلسة «${cancelTarget?.title || ""}»؟`}
        confirmLabel="إلغاء الجلسة"
        tone="danger"
        loading={Boolean(cancelTarget && mutatingId === cancelTarget.id)}
        onConfirm={() => cancelTarget && handleCancelSession(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
      />

      <AdminConfirmDialog
        open={Boolean(confirmUser)}
        title={isVerify ? "توثيق المدرس" : isSuspend ? "تعليق الحساب" : "تفعيل الحساب"}
        description={
          isVerify
            ? `تأكيد توثيق حساب المدرس «${confirmUser?.full_name || ""}»؟`
            : isSuspend
              ? `تعليق حساب «${confirmUser?.full_name || ""}»؟ لن يتمكن من استخدام المنصة.`
              : `تفعيل حساب «${confirmUser?.full_name || ""}»؟`
        }
        confirmLabel={isVerify ? "توثيق" : isSuspend ? "تعليق" : "تفعيل"}
        tone={isSuspend ? "danger" : "primary"}
        loading={Boolean(confirmUser && mutatingId === confirmUser.id)}
        onConfirm={() => {
          if (isVerify && confirmUser) handleVerify(confirmUser);
          else if (confirmUser) executeSuspendToggle(confirmUser);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}
