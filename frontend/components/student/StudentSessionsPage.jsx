"use client";

import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StudentSessionsFilters from "@/components/student/StudentSessionsFilters";
import StudentSessionsList from "@/components/student/StudentSessionsList";
import StudentSessionsLiveBanner from "@/components/student/StudentSessionsLiveBanner";
import StudentSessionsStats from "@/components/student/StudentSessionsStats";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { studentErrorBox } from "@/lib/student-styles";

export default function StudentSessionsPage({
  tab = "available",
  tabs = [],
  onTabChange,
  search = "",
  onSearchChange,
  onSearchSubmit,
  onlyMyGrade = true,
  onOnlyMyGradeChange,
  schoolLevel = "",
  onSchoolLevelChange,
  schoolLevelOptions = [],
  subject = "",
  onSubjectChange,
  subjectOptions = [],
  maxPrice = "",
  onMaxPriceChange,
  maxPriceOptions = [],
  dateFrom = "",
  onDateFromChange,
  dateTo = "",
  onDateToChange,
  onClearFilters,
  sessions = [],
  tabCounts = {},
  gradeLabel = "",
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
  showEnroll = false,
  showDateFilters = true
}) {
  const tabsWithBadges = tabs.map((item) => ({
    ...item,
    badge: tabCounts[item.key] > 0 ? tabCounts[item.key] : undefined
  }));

  const hasActiveFilters =
    Boolean(search.trim()) ||
    !onlyMyGrade ||
    Boolean(schoolLevel) ||
    Boolean(subject) ||
    Boolean(maxPrice) ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const liveCount = tabCounts.live ?? 0;

  if (loading && !sessions.length && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري تحميل الجلسات..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="جلساتي"
        title="تصفح الجلسات"
        subtitle={
          gradeLabel
            ? `جلسات مناسبة لـ ${gradeLabel} — احجز أو ادخل البث المباشر`
            : "اكتشف الجلسات المتاحة واحجز مكانك"
        }
        actions={[
          {
            label: refreshing || loading ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || loading
          },
          {
            label: "لوحتي",
            icon: "dashboard",
            variant: "secondary",
            href: "/student/dashboard"
          }
        ]}
      />

      {error ? (
        <div className={studentErrorBox}>
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
          <StudentSessionsStats tabCounts={tabCounts} loading={loading && !tabCounts.available} />

          {tab !== "live" && liveCount > 0 ? (
            <StudentSessionsLiveBanner count={liveCount} onViewLive={() => onTabChange?.("live")} />
          ) : null}

          <AdminFilterTabs
            tabs={tabsWithBadges}
            value={tab}
            onChange={onTabChange}
            className="w-full max-w-full overflow-x-auto"
          />

          <StudentSessionsFilters
            tab={tab}
            search={search}
            onSearchChange={onSearchChange}
            onSearchSubmit={onSearchSubmit}
            onlyMyGrade={onlyMyGrade}
            onOnlyMyGradeChange={onOnlyMyGradeChange}
            schoolLevel={schoolLevel}
            onSchoolLevelChange={onSchoolLevelChange}
            schoolLevelOptions={schoolLevelOptions}
            subject={subject}
            onSubjectChange={onSubjectChange}
            subjectOptions={subjectOptions}
            maxPrice={maxPrice}
            onMaxPriceChange={onMaxPriceChange}
            maxPriceOptions={maxPriceOptions}
            dateFrom={dateFrom}
            onDateFromChange={onDateFromChange}
            dateTo={dateTo}
            onDateToChange={onDateToChange}
            onClearFilters={onClearFilters}
            gradeLabel={gradeLabel}
            loading={loading}
            showDateFilters={showDateFilters}
            totalCount={totalCount}
            hasActiveFilters={hasActiveFilters}
          />

          <StudentSessionsList
            sessions={sessions}
            loading={loading}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={onPageChange}
            emptyTitle={emptyTitle}
            emptyHint={emptyHint}
            showEnroll={showEnroll}
          />
        </>
      ) : null}
    </div>
  );
}
