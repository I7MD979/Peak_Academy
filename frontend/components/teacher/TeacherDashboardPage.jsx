"use client";

// TODO: move AdminPageHeader to shared
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import TeacherDashboardCompletedTable from "@/components/teacher/TeacherDashboardCompletedTable";
import TeacherDashboardLiveBanner from "@/components/teacher/TeacherDashboardLiveBanner";
import TeacherDashboardQuickActions from "@/components/teacher/TeacherDashboardQuickActions";
import TeacherDashboardStats from "@/components/teacher/TeacherDashboardStats";
import TeacherDashboardUpcomingTable from "@/components/teacher/TeacherDashboardUpcomingTable";
import TeacherDashboardWelcome from "@/components/teacher/TeacherDashboardWelcome";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { resolveTeacherFirstName } from "@/lib/teacher-dashboard";
import { teacherErrorBox } from "@/lib/teacher-styles";

export default function TeacherDashboardPage({
  profile,
  stats,
  upcomingSessions = [],
  recentCompleted = [],
  loading = false,
  refreshing = false,
  error = "",
  onRefresh,
  actionLoadingId = "",
  onStartSession,
  onEndSession
}) {
  const firstName = resolveTeacherFirstName(profile);
  const liveCount = stats?.live_sessions ?? 0;

  if (loading && !profile && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري تحميل لوحة المعلم..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="لوحة المعلم"
        title={`أهلاً، ${firstName}!`}
        subtitle="متابعة الجلسات، إدارة الوقت، ومراجعة أرباحك من مكان واحد."
        actions={[
          {
            label: refreshing || loading ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || loading
          },
          {
            label: "جلسة جديدة",
            icon: "plus",
            href: "/teacher/sessions/new"
          }
        ]}
      />

      {error ? (
        <div className={teacherErrorBox}>
          <p>{error}</p>
          {onRefresh ? (
            <button type="button" className="mt-2 text-sm font-bold text-peak-orange underline" onClick={onRefresh}>
              إعادة المحاولة
            </button>
          ) : null}
        </div>
      ) : null}

      {!error ? (
        <>
          {profile ? <TeacherDashboardWelcome profile={profile} /> : null}

          <TeacherDashboardStats stats={stats} loading={loading && !stats} />

          <TeacherDashboardLiveBanner count={liveCount} />

          <TeacherDashboardQuickActions />

          <TeacherDashboardUpcomingTable
            sessions={upcomingSessions}
            loading={loading}
            actionLoadingId={actionLoadingId}
            onStartSession={onStartSession}
            onEndSession={onEndSession}
          />

          <TeacherDashboardCompletedTable sessions={recentCompleted} loading={loading} />
        </>
      ) : null}
    </div>
  );
}
