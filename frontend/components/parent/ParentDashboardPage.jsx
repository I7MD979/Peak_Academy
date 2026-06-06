"use client";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ParentDashboardAlerts from "@/components/parent/ParentDashboardAlerts";
import ParentDashboardChildrenPanel from "@/components/parent/ParentDashboardChildrenPanel";
import ParentDashboardLiveBanner from "@/components/parent/ParentDashboardLiveBanner";
import ParentDashboardQuickActions from "@/components/parent/ParentDashboardQuickActions";
import ParentDashboardRecentActivity from "@/components/parent/ParentDashboardRecentActivity";
import ParentDashboardSecondaryStats from "@/components/parent/ParentDashboardSecondaryStats";
import ParentDashboardStats from "@/components/parent/ParentDashboardStats";
import ParentDashboardStudentHero from "@/components/parent/ParentDashboardStudentHero";
import ParentDashboardSubjects from "@/components/parent/ParentDashboardSubjects";
import EmptyState from "@/components/shared/EmptyState";
import { DashboardSkeleton, SectionLoader } from "@/components/shared/LoadingSkeleton";
import { buildParentReportHref, resolveParentFirstName } from "@/lib/parent-dashboard";
import { parentErrorBox } from "@/lib/parent-styles";

export default function ParentDashboardPage({
  parentName = "",
  linkedChildren = [],
  selectedId = "",
  onSelectChild,
  report = null,
  showLinkForm = false,
  onToggleLinkForm,
  linkCode = "",
  onLinkCodeChange,
  onLinkSubmit,
  linking = false,
  loading = false,
  refreshing = false,
  error = "",
  onRefresh
}) {
  const firstName = resolveParentFirstName(parentName);
  const student = report?.student;
  const stats = report?.stats;
  const reportHref = buildParentReportHref(selectedId);

  if (loading && linkedChildren.length === 0 && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري تحميل لوحة ولي الأمر..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AdminPageHeader
        eyebrow="لوحة ولي الأمر"
        title={`أهلاً، ${firstName}!`}
        subtitle="تابع تقدم أبنائك في الجلسات والمواد والأسئلة — كل شيء في مكان واحد."
        actions={[
          {
            label: refreshing || loading ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || loading
          },
          {
            label: "التقرير",
            icon: "book",
            variant: "secondary",
            href: reportHref
          }
        ]}
      />

      {error ? (
        <section className={parentErrorBox}>
          <p className="text-sm font-bold text-danger">{error}</p>
          {onRefresh ? (
            <button type="button" className="mt-3 text-sm font-bold text-peak-orange underline" onClick={onRefresh}>
              إعادة المحاولة
            </button>
          ) : null}
        </section>
      ) : null}

      <ParentDashboardChildrenPanel
        linkedChildren={linkedChildren}
        selectedId={selectedId}
        onSelectChild={onSelectChild}
        showLinkForm={showLinkForm}
        onToggleLinkForm={onToggleLinkForm}
        linkCode={linkCode}
        onLinkCodeChange={onLinkCodeChange}
        onLinkSubmit={onLinkSubmit}
        linking={linking}
      />

      {loading && linkedChildren.length > 0 ? <DashboardSkeleton /> : null}

      {!loading && linkedChildren.length === 0 ? (
        <EmptyState
          title="لا يوجد طالب مربوط بعد"
          description="اطلب من ابنك فتح «حسابي» في تطبيق الطالب ونسخ كود الربط، ثم أدخله أعلاه."
        />
      ) : null}

      {!loading && student && stats ? (
        <>
          <ParentDashboardLiveBanner
            studentName={student.full_name}
            liveCount={stats.live_sessions ?? 0}
            reportHref={reportHref}
          />

          <ParentDashboardStudentHero student={student} />

          <ParentDashboardStats stats={stats} loading={loading && !stats.sessions_this_month} />

          <ParentDashboardSecondaryStats stats={stats} />

          <ParentDashboardAlerts alerts={report.alerts || []} />

          <ParentDashboardSubjects subjects={report.subjects || []} reportHref={reportHref} />

          <ParentDashboardRecentActivity sessions={report.recent_sessions || []} />

          <ParentDashboardQuickActions reportHref={reportHref} onRefresh={onRefresh} refreshing={refreshing} />
        </>
      ) : null}

      {!loading && linkedChildren.length > 0 && !student ? (
        <EmptyState
          title="تعذر عرض بيانات الطالب"
          description="جرّب التحديث أو اختر طالباً آخر من القائمة أعلاه."
        />
      ) : null}
    </div>
  );
}
