"use client";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import DataTable from "@/components/admin/DataTable";
import RevenueChart from "@/components/admin/RevenueChart";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { Select } from "@/components/ui/Select";
import { adminBtnSecondary, adminCardSolid, adminErrorBox } from "@/lib/admin-styles";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { value: "month", label: "هذا الشهر" },
  { value: "3months", label: "آخر 3 شهور" },
  { value: "6months", label: "آخر 6 شهور" },
  { value: "year", label: "هذا العام" }
];

const rankStyles = {
  1: "bg-amber-500/20 text-amber-400",
  2: "bg-surface-container-highest text-on-surface-variant",
  3: "bg-md-primary/20 text-md-primary"
};

function RankBadge({ rank }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
        rankStyles[rank] || "bg-surface-container-highest text-on-surface-variant"
      )}
    >
      {rank}
    </span>
  );
}

function RatingStars({ value }) {
  const full = Math.round(Number(value) || 0);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`تقييم ${value} من 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? "opacity-100" : "opacity-25"}>
          ★
        </span>
      ))}
      <span className="mr-1 text-sm font-bold text-on-surface">{value || "—"}</span>
    </span>
  );
}

function StatCard({ icon, label, value, sub, tone = "default", active, onClick }) {
  const toneClasses = {
    default: "text-md-primary bg-md-primary/10",
    success: "text-success bg-success/10",
    blue: "text-accent-blue bg-accent-blue/10",
    accent: "text-accent bg-accent/10",
    warning: "text-warning bg-warning/10"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-5 text-start transition-all",
        active
          ? "border-md-primary bg-surface-container-high shadow-lg shadow-md-primary/10"
          : "border-outline-variant bg-surface-container-low hover:border-md-primary/40"
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={cn("rounded-lg p-2", toneClasses[tone] || toneClasses.default)}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
      <h3 className="mt-1 text-2xl font-bold text-on-surface">{value}</h3>
      {sub ? <p className="mt-1 text-xs font-bold text-md-primary">{sub}</p> : null}
    </button>
  );
}

export default function AdminReportsView({
  loading = false,
  error = "",
  period = "month",
  onPeriodChange,
  dateFrom = "",
  onDateFromChange,
  dateTo = "",
  onDateToChange,
  onClearDates,
  periodLabel = "هذا الشهر",
  summary = null,
  monthlyRevenue = [],
  topTeachers = [],
  topSubjects = [],
  teacherColumns = [],
  subjectColumns = [],
  activeStat = "",
  onStatFocus,
  onRefresh,
  onExportPdf,
  onExportCsv
}) {
  const statCards = [
    {
      key: "revenue",
      icon: "payments",
      label: "إيرادات المنصة",
      value: loading ? "…" : formatCurrencyEgp(summary?.platform_revenue),
      sub: periodLabel,
      tone: "success",
      sectionId: "reports-chart"
    },
    {
      key: "withdrawn",
      icon: "account_balance_wallet",
      label: "المسحوبات المدفوعة",
      value: loading ? "…" : formatCurrencyEgp(summary?.total_withdrawn),
      sub: "تم تحويلها للمدرسين",
      tone: "blue",
      sectionId: "reports-chart"
    },
    {
      key: "students",
      icon: "school",
      label: "طلاب جدد",
      value: loading ? "…" : (summary?.new_students ?? 0).toLocaleString("ar-EG"),
      sub: "مسجلون في الفترة",
      tone: "accent",
      sectionId: "reports-teachers"
    },
    {
      key: "sessions",
      icon: "check_circle",
      label: "جلسات مكتملة",
      value: loading ? "…" : (summary?.completed_sessions ?? 0).toLocaleString("ar-EG"),
      sub: "جلسات منتهية",
      tone: "default",
      sectionId: "reports-subjects"
    },
    {
      key: "rating",
      icon: "star",
      label: "متوسط التقييم",
      value: loading ? "…" : <RatingStars value={summary?.avg_rating} />,
      sub: summary?.reviews_count
        ? `${summary.reviews_count.toLocaleString("ar-EG")} تقييم`
        : "من تقييمات الطلاب",
      tone: "warning",
      sectionId: "reports-teachers"
    }
  ];

  const usingCustomRange = Boolean(dateFrom || dateTo);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="التقارير المالية"
        title="ملخص الأداء والإيرادات"
        subtitle="تتبع إيرادات المنصة، المسحوبات، أفضل المدرسين والمواد خلال الفترة المحددة."
        actions={[
          {
            label: "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: loading
          },
          {
            label: "تصدير CSV",
            icon: "download",
            variant: "secondary",
            onClick: onExportCsv,
            disabled: loading || !summary
          },
          {
            label: "تحميل PDF",
            icon: "description",
            onClick: onExportPdf,
            disabled: loading
          }
        ]}
      />

      <section className={cn(adminCardSolid, "p-4 md:p-5")}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select
            label="الفترة الزمنية"
            variant="dark"
            value={period}
            onChange={(event) => onPeriodChange?.(event.target.value)}
            options={PERIOD_OPTIONS}
            disabled={usingCustomRange}
            aria-label="اختيار الفترة الزمنية"
          />

          <CustomDatePicker
            label="من تاريخ"
            variant="dark"
            value={dateFrom}
            onChange={(e) => onDateFromChange?.(e.target.value)}
            max={dateTo || undefined}
            placeholder="بداية الفترة"
          />

          <CustomDatePicker
            label="إلى تاريخ"
            variant="dark"
            value={dateTo}
            onChange={(e) => onDateToChange?.(e.target.value)}
            min={dateFrom || undefined}
            placeholder="نهاية الفترة"
          />

          <div className="flex items-end">
            <button
              type="button"
              className={cn(adminBtnSecondary, "h-11 w-full")}
              onClick={onClearDates}
              disabled={!usingCustomRange}
            >
              مسح التواريخ
            </button>
          </div>
        </div>

        {usingCustomRange ? (
          <p className="mt-3 text-xs font-semibold text-md-primary">
            يتم استخدام الفترة المخصصة — اختر «مسح التواريخ» للعودة للفترات الجاهزة
          </p>
        ) : null}
      </section>

      {error ? (
        <div className={adminErrorBox}>
          <p>{error}</p>
          <button type="button" className={cn(adminBtnSecondary, "mt-3")} onClick={onRefresh}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={card.value}
            sub={card.sub}
            tone={card.tone}
            active={activeStat === card.key}
            onClick={() => onStatFocus?.(card.key, card.sectionId)}
          />
        ))}
      </div>

      <section id="reports-chart" className={cn(adminCardSolid, "scroll-mt-24 p-5")}>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-on-surface">الإيرادات الشهرية</h3>
            <p className="text-sm text-on-surface-variant">
              مقارنة إيرادات المنصة (أخضر) مع المسحوبات المدفوعة (أزرق) — {periodLabel}
            </p>
          </div>
          <div className="flex gap-4 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-success" />
              إيرادات المنصة
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent-blue" />
              المسحوبات
            </span>
          </div>
        </div>
        <RevenueChart data={monthlyRevenue} loading={loading} variant="dark" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section id="reports-teachers" className={cn(adminCardSolid, "scroll-mt-24 p-5")}>
          <h3 className="text-lg font-bold text-on-surface">أفضل 5 مدرسين</h3>
          <p className="mb-4 text-sm text-on-surface-variant">حسب إجمالي الأرباح في {periodLabel}</p>
          <DataTable
            columns={teacherColumns}
            data={topTeachers.map((row) => ({ ...row, _key: `teacher-${row.teacher_id || row.rank}` }))}
            loading={loading}
            emptyMessage="لا توجد بيانات مدرسين لهذه الفترة"
            variant="dark"
          />
        </section>

        <section id="reports-subjects" className={cn(adminCardSolid, "scroll-mt-24 p-5")}>
          <h3 className="text-lg font-bold text-on-surface">أفضل 5 مواد</h3>
          <p className="mb-4 text-sm text-on-surface-variant">حسب عدد الطلاب المسجلين في الجلسات</p>
          <DataTable
            columns={subjectColumns}
            data={topSubjects.map((row) => ({ ...row, _key: `subject-${row.rank}` }))}
            loading={loading}
            emptyMessage="لا توجد بيانات مواد لهذه الفترة"
            variant="dark"
          />
        </section>
      </div>
    </div>
  );
}

export { RankBadge, RatingStars };
