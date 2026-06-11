"use client";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ParentDashboardAlerts from "@/components/parent/ParentDashboardAlerts";
import ParentDashboardStudentHero from "@/components/parent/ParentDashboardStudentHero";
import ParentReportActions from "@/components/parent/ParentReportActions";
import ParentReportFilters from "@/components/parent/ParentReportFilters";
import ParentReportLinkPanel from "@/components/parent/ParentReportLinkPanel";
import ParentReportRecentSessions from "@/components/parent/ParentReportRecentSessions";
import ParentReportStats from "@/components/parent/ParentReportStats";
import ParentReportSubjects from "@/components/parent/ParentReportSubjects";
import EmptyState from "@/components/shared/EmptyState";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { parentErrorBox, parentMuted } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentReportPage({
  linkedChildren = [],
  selectedId = "",
  onSelectedIdChange,
  period = "month",
  onPeriodChange,
  dateFrom = "",
  onDateFromChange,
  dateTo = "",
  onDateToChange,
  report = null,
  linkCode = "",
  onLinkCodeChange,
  onLinkSubmit,
  linking = false,
  loading = false,
  reportLoading = false,
  downloading = false,
  refreshing = false,
  error = "",
  onRetry,
  onRefresh,
  onDownload
}) {
  const stats = report?.stats;
  const student = report?.student;

  if (loading && linkedChildren.length === 0 && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري تحميل التقارير..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="متابعة الأداء"
        title="تقرير الطالب"
        subtitle="ملخص عن الجلسات والمواد والأسئلة — مبني على بيانات حقيقية من المنصة مع إمكانية تصفية الفترة الزمنية."
        actions={[
          {
            label: refreshing || reportLoading ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || reportLoading || !selectedId
          },
          {
            label: "الرئيسية",
            icon: "home",
            variant: "secondary",
            href: "/parent/dashboard"
          }
        ]}
      />

      {error ? (
        <section className={parentErrorBox}>
          <p className="text-sm font-bold text-danger">{error}</p>
          <button type="button" className="mt-3 text-sm font-bold text-peak-orange underline" onClick={onRetry}>
            إعادة المحاولة
          </button>
        </section>
      ) : null}

      <ParentReportLinkPanel
        linkCode={linkCode}
        onLinkCodeChange={onLinkCodeChange}
        onLinkSubmit={onLinkSubmit}
        linking={linking}
      />

      {linkedChildren.length === 0 ? (
        <EmptyState
          title="لا يوجد طالب مربوط بعد"
          description="أدخل كود الربط أعلاه لمتابعة تقرير ابنك."
        />
      ) : (
        <>
          <ParentReportFilters
            linkedChildren={linkedChildren}
            selectedId={selectedId}
            onSelectedIdChange={onSelectedIdChange}
            period={period}
            onPeriodChange={onPeriodChange}
            dateFrom={dateFrom}
            onDateFromChange={onDateFromChange}
            dateTo={dateTo}
            onDateToChange={onDateToChange}
          />

          {reportLoading && !report ? (
            <SectionLoader message="جاري تحميل التقرير..." />
          ) : null}

          {report && student ? (
            <>
              {(stats?.live_sessions ?? 0) > 0 ? (
                <section className="rounded-2xl border border-danger/40 bg-danger/10 p-4 md:p-5">
                  <p className="font-black text-auth-on-surface">جلسة مباشرة الآن</p>
                  <p className={cn("mt-1 text-sm", parentMuted)}>
                    {student.full_name} لديه {(stats.live_sessions ?? 0).toLocaleString("ar-EG")}{" "}
                    {stats.live_sessions === 1 ? "جلسة مباشرة" : "جلسات مباشرة"} في هذه الفترة.
                  </p>
                </section>
              ) : null}

              <ParentDashboardStudentHero student={student} />

              <ParentReportStats stats={stats} period={period} loading={reportLoading && !stats} />

              <ParentDashboardAlerts alerts={report.alerts || []} />

              <ParentReportSubjects subjects={report.subjects || []} />

              <ParentReportRecentSessions sessions={report.recent_sessions || []} />

              <ParentReportActions
                onDownload={onDownload}
                downloading={downloading}
                disabled={!selectedId}
              />
            </>
          ) : reportLoading ? null : selectedId ? (
            <EmptyState
              title="لا توجد بيانات للتقرير"
              description="جرّب توسيع الفترة الزمنية أو تحديث الصفحة."
            />
          ) : null}
        </>
      )}
    </div>
  );
}
