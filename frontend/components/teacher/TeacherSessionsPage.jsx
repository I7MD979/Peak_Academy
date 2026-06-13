"use client";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import TeacherSessionDetailsModal from "@/components/teacher/TeacherSessionDetailsModal";
import TeacherSessionsFilters from "@/components/teacher/TeacherSessionsFilters";
import TeacherSessionsList from "@/components/teacher/TeacherSessionsList";
import TeacherSessionsLiveBanner from "@/components/teacher/TeacherDashboardLiveBanner";
import TeacherSessionsStats from "@/components/teacher/TeacherSessionsStats";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { VerificationStatusBanner } from "@/components/shared/VerificationStatusBanner";
import { teacherErrorBox } from "@/lib/teacher-styles";

export default function TeacherSessionsPage({
  status = "all",
  statusTabs = [],
  tabCounts = {},
  countsLoading = false,
  onStatusChange,
  search = "",
  onSearchChange,
  onSearchSubmit,
  sessions = [],
  loading = false,
  refreshing = false,
  error = "",
  onRefresh,
  page = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  emptyTitle = "",
  emptyHint = "",
  actionId = "",
  onStart,
  onEnd,
  onCancel,
  onJoin,
  selectedSession = null,
  onSelectSession,
  onCloseDetails,
  verificationStatus = "unverified"
}) {
  const liveCount = tabCounts.live ?? 0;

  if (loading && !sessions.length && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري تحميل جلساتك..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <VerificationStatusBanner role="teacher" verificationStatus={verificationStatus} />

      <AdminPageHeader
        eyebrow="جلساتي"
        title="إدارة جلساتك التعليمية"
        subtitle="تابع الجلسات القادمة والمباشرة، ابدأ البث في الوقت المناسب، وأنهِ الجلسة لتسجيل الحضور والأرباح."
        actions={[
          {
            label: refreshing || loading ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || loading || countsLoading
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
          <TeacherSessionsStats tabCounts={tabCounts} loading={countsLoading && !tabCounts.scheduled} />

          {status !== "live" && liveCount > 0 ? (
            <TeacherSessionsLiveBanner count={liveCount} />
          ) : null}

          <TeacherSessionsFilters
            status={status}
            tabs={statusTabs}
            tabCounts={tabCounts}
            countsLoading={countsLoading}
            onStatusChange={onStatusChange}
            search={search}
            onSearchChange={onSearchChange}
            onSearchSubmit={onSearchSubmit}
            loading={loading}
          />

          <TeacherSessionsList
            sessions={sessions}
            loading={loading}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={onPageChange}
            emptyTitle={emptyTitle}
            emptyHint={emptyHint}
            actionId={actionId}
            onDetails={onSelectSession}
            onStart={onStart}
            onEnd={onEnd}
            onCancel={onCancel}
            onJoin={onJoin}
            verificationStatus={verificationStatus}
          />
        </>
      ) : null}

      <TeacherSessionDetailsModal session={selectedSession} onClose={onCloseDetails} />
    </div>
  );
}
