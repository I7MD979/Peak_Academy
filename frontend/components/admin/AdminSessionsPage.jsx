"use client";

import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import DataTable from "@/components/admin/DataTable";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { Select } from "@/components/ui/Select";
import { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import { adminBtnSecondary, adminCardSolid, adminErrorBox, adminInput } from "@/lib/admin-styles";
import { PAGE_CONTAINER } from "@/lib/page-layout";
import { cn } from "@/lib/utils";

const SCHOOL_LEVEL_OPTIONS = [
  { value: "", label: "جميع المراحل" },
  { value: "preparatory", label: "إعدادي" },
  { value: "secondary", label: "ثانوي" }
];

const ALL_GRADE_OPTIONS = [
  { value: "", label: "جميع الصفوف" },
  { value: "prep_first", label: "الأول الإعدادي" },
  { value: "prep_second", label: "الثاني الإعدادي" },
  { value: "prep_third", label: "الثالث الإعدادي" },
  { value: "sec_first", label: "الأول الثانوي" },
  { value: "sec_second", label: "الثاني الثانوي" },
  { value: "sec_third", label: "الثالث الثانوي" }
];

const GRADES_BY_LEVEL = {
  preparatory: ALL_GRADE_OPTIONS.filter((o) => !o.value || o.value.startsWith("prep_")),
  secondary: ALL_GRADE_OPTIONS.filter((o) => !o.value || o.value.startsWith("sec_"))
};

function StatCard({ icon, label, value, tone = "default", active, live, onClick }) {
  const toneClasses = {
    default: "text-md-primary bg-md-primary/10",
    live: "text-green-400 bg-green-500/10",
    blue: "text-accent-blue bg-accent-blue/10",
    danger: "text-error bg-error/10"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-5 text-start transition-all",
        active
          ? "border-md-primary bg-auth-surface-high shadow-lg shadow-md-primary/10"
          : "border-auth-outline-variant/40 bg-auth-surface-low hover:border-md-primary/40"
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={cn("rounded-lg p-2", toneClasses[tone] || toneClasses.default)}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        {live ? (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-green-400">مباشر</span>
          </span>
        ) : null}
      </div>
      <p className="text-xs font-semibold text-auth-on-surface-variant">{label}</p>
      <h3 className="mt-1 text-2xl font-bold text-auth-on-surface">
        {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
      </h3>
    </button>
  );
}

export default function AdminSessionsPage({
  sessions = [],
  columns = [],
  loading = false,
  error = "",
  stats = null,
  statsLoading = false,
  refreshing = false,
  statusFilter = "all",
  onStatusFilterChange,
  statusTabs = [],
  searchInput = "",
  onSearchChange,
  schoolLevelFilter = "",
  onSchoolLevelFilterChange,
  gradeFilter = "",
  onGradeFilterChange,
  scheduledFrom = "",
  onScheduledFromChange,
  scheduledTo = "",
  onScheduledToChange,
  onClearDates,
  onClearFilters,
  page = 1,
  totalPages = 1,
  totalSessions = 0,
  onPageChange,
  onRefresh,
  onCloseOpenSessions,
  closingOpen = false,
  onStatFilter
}) {
  const statCards = [
    {
      key: "total",
      icon: "live_tv",
      label: "إجمالي الجلسات",
      value: statsLoading ? "…" : (stats?.total ?? 0),
      tone: "default",
      filter: "all"
    },
    {
      key: "scheduled",
      icon: "schedule",
      label: "مجدولة",
      value: statsLoading ? "…" : (stats?.scheduled ?? 0),
      tone: "default",
      filter: "scheduled"
    },
    {
      key: "live",
      icon: "sensors",
      label: "مباشرة الآن",
      value: statsLoading ? "…" : (stats?.live ?? 0),
      tone: "live",
      live: (stats?.live ?? 0) > 0,
      filter: "live"
    },
    {
      key: "completed",
      icon: "check_circle",
      label: "مكتملة",
      value: statsLoading ? "…" : (stats?.completed ?? 0),
      tone: "blue",
      filter: "completed"
    },
    {
      key: "cancelled",
      icon: "cancel",
      label: "ملغاة",
      value: statsLoading ? "…" : (stats?.cancelled ?? 0),
      tone: "danger",
      filter: "cancelled"
    }
  ];

  const gradeOptions =
    schoolLevelFilter && GRADES_BY_LEVEL[schoolLevelFilter]
      ? GRADES_BY_LEVEL[schoolLevelFilter]
      : ALL_GRADE_OPTIONS;

  const hasDateFilter = Boolean(scheduledFrom || scheduledTo);
  const hasActiveFilters = Boolean(
    schoolLevelFilter || gradeFilter || scheduledFrom || scheduledTo || searchInput.trim()
  );

  return (
    <div className={PAGE_CONTAINER}>
      <AdminPageHeader
        eyebrow="إدارة المنصة"
        title="الجلسات التعليمية"
        subtitle="راقب جلسات المدرسين — المجدولة والمباشرة والمنتهية. ابحث بالعنوان أو اسم المدرس، وصفِّ حسب المرحلة والتاريخ."
        actions={[
          {
            label: closingOpen ? "جاري الإغلاق…" : "إغلاق المفتوحة",
            icon: "shield",
            variant: "secondary",
            onClick: onCloseOpenSessions,
            disabled: closingOpen || refreshing
          },
          {
            label: refreshing ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing
          }
        ]}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {statsLoading && !stats
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => (
              <StatCard
                key={card.key}
                icon={card.icon}
                label={card.label}
                value={card.value}
                tone={card.tone}
                live={card.live}
                active={statusFilter === card.filter || (card.key === "total" && statusFilter === "all")}
                onClick={() => onStatFilter?.(card.filter)}
              />
            ))}
      </div>

      {error ? <div className={adminErrorBox}>{error}</div> : null}

      <div className={cn(adminCardSolid, "overflow-hidden")}>
        <div className="space-y-4 border-b border-auth-outline-variant/20 bg-auth-surface-low/80 p-4">
          <AdminFilterTabs tabs={statusTabs} value={statusFilter} onChange={onStatusFilterChange} />

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <Select
                variant="dark"
                className="w-44"
                label="المرحلة الدراسية"
                value={schoolLevelFilter}
                onChange={(e) => onSchoolLevelFilterChange?.(e.target.value)}
                options={SCHOOL_LEVEL_OPTIONS}
                aria-label="تصفية حسب المرحلة"
              />
              <Select
                variant="dark"
                className="w-44"
                label="الصف"
                value={gradeFilter}
                onChange={(e) => onGradeFilterChange?.(e.target.value)}
                options={gradeOptions}
                aria-label="تصفية حسب الصف"
              />
              <CustomDatePicker
                variant="dark"
                className="w-44"
                label="من تاريخ"
                value={scheduledFrom}
                onChange={(e) => onScheduledFromChange?.(e.target.value)}
                placeholder="بداية الموعد"
              />
              <CustomDatePicker
                variant="dark"
                className="w-44"
                label="إلى تاريخ"
                value={scheduledTo}
                onChange={(e) => onScheduledToChange?.(e.target.value)}
                placeholder="نهاية الموعد"
              />
              {hasDateFilter ? (
                <button type="button" className={cn(adminBtnSecondary, "h-11 px-4 text-xs")} onClick={onClearDates}>
                  مسح التاريخ
                </button>
              ) : null}
              {hasActiveFilters ? (
                <button type="button" className={cn(adminBtnSecondary, "h-11 px-4 text-xs")} onClick={onClearFilters}>
                  مسح الكل
                </button>
              ) : null}
            </div>

            <div className="relative w-full max-w-sm">
              <span className="material-symbols-outlined pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-base text-auth-on-surface-variant">
                search
              </span>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="بحث بالعنوان أو اسم المدرس..."
                className={cn(adminInput, "h-11 ps-10")}
                aria-label="بحث الجلسات"
              />
            </div>
          </div>

          <p className="text-xs text-auth-on-surface-variant">
            النتائج المطابقة:{" "}
            <span className="font-bold text-md-primary">{totalSessions.toLocaleString("ar-EG")}</span> جلسة
          </p>
        </div>

        <div className="p-2">
          <DataTable
            columns={columns}
            data={sessions}
            loading={loading}
            emptyMessage="لا توجد جلسات"
            emptyDescription="جرّب تغيير التصفية أو البحث أو نطاق التاريخ"
            variant="dark"
          />
        </div>

        <AdminPagination
          page={page}
          totalPages={totalPages}
          loading={loading}
          totalLabel={`عرض ${sessions.length} من ${totalSessions.toLocaleString("ar-EG")} في هذه الصفحة`}
          onPrev={() => onPageChange?.(page - 1)}
          onNext={() => onPageChange?.(page + 1)}
          className="rounded-none border-0 border-t border-auth-outline-variant/20 bg-auth-surface-low/50"
        />
      </div>
    </div>
  );
}
