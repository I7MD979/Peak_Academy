"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import StatsCard from "@/components/admin/StatsCard";
import DataTable from "@/components/admin/DataTable";
import RevenueChart from "@/components/admin/RevenueChart";
import { Button } from "@/components/ui/button";
import { dashboardApi } from "@/lib/api";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

const periodOptions = [
  { key: "month", label: "هذا الشهر" },
  { key: "3months", label: "آخر 3 شهور" },
  { key: "6months", label: "آخر 6 شهور" },
  { key: "year", label: "هذا العام" }
];

const rankStyles = {
  1: "bg-amber-100 text-amber-800",
  2: "bg-slate-200 text-slate-700",
  3: "bg-orange-100 text-orange-800"
};

function RankBadge({ rank }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
        rankStyles[rank] || "bg-muted text-text-muted"
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
      <span className="mr-1 text-sm font-bold text-text">{value || "—"}</span>
    </span>
  );
}

export default function AdminReportsPage() {
  const [period, setPeriod] = useState("month");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await dashboardApi.adminReports(period);
      setReport(res?.data || null);
    } catch (err) {
      setReport(null);
      setError(err.message || "تعذر تحميل التقارير. تأكد أن الخادم يعمل.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const summary = report?.summary;
  const monthlyRevenue = report?.monthly_revenue || [];
  const topTeachers = report?.top_teachers || [];
  const topSubjects = report?.top_subjects || [];

  const periodLabel = useMemo(
    () => periodOptions.find((p) => p.key === period)?.label || "هذا الشهر",
    [period]
  );

  const handleExportPdf = () => {
    toast.info("تصدير PDF سيتوفر قريباً");
  };

  const teacherColumns = useMemo(
    () => [
      {
        key: "rank",
        label: "#",
        render: (row) => <RankBadge rank={row.rank} />
      },
      {
        key: "teacher_name",
        label: "المدرس",
        render: (row) => <span className="font-semibold text-text">{row.teacher_name}</span>
      },
      { key: "subject", label: "المادة" },
      {
        key: "sessions_count",
        label: "الجلسات",
        render: (row) => <span>{row.sessions_count.toLocaleString("ar-EG")}</span>
      },
      {
        key: "total_earnings",
        label: "إجمالي الأرباح",
        render: (row) => (
          <span className="font-bold text-success">{formatCurrencyEgp(row.total_earnings)}</span>
        )
      }
    ],
    []
  );

  const subjectColumns = useMemo(
    () => [
      {
        key: "rank",
        label: "#",
        render: (row) => <RankBadge rank={row.rank} />
      },
      {
        key: "subject",
        label: "المادة",
        render: (row) => <span className="font-semibold text-text">{row.subject}</span>
      },
      {
        key: "sessions_count",
        label: "الجلسات",
        render: (row) => <span>{row.sessions_count.toLocaleString("ar-EG")}</span>
      },
      {
        key: "students_count",
        label: "الطلاب",
        render: (row) => (
          <span className="font-bold text-accent-blue">{row.students_count.toLocaleString("ar-EG")}</span>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-2xl border border-border bg-gradient-to-l from-primary/5 via-card to-accent/5 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-accent">التقارير المالية</p>
            <h2 className="mt-1 text-2xl font-black text-primary">ملخص الأداء والإيرادات</h2>
            <p className="mt-2 max-w-xl text-sm text-text-muted">
              تتبع إيرادات المنصة، المسحوبات، أفضل المدرسين والمواد خلال الفترة المحددة.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={loadReports} disabled={loading}>
              تحديث
            </Button>
            <Button type="button" onClick={handleExportPdf}>
              تحميل PDF
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPeriod(option.key)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                period === option.key
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card text-text-muted ring-1 ring-border hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={loadReports}>
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="إيرادات المنصة"
          value={loading ? "…" : formatCurrencyEgp(summary?.platform_revenue)}
          iconName="money"
          tone="success"
          hint={periodLabel}
        />
        <StatsCard
          title="طلاب جدد"
          value={loading ? "…" : (summary?.new_students ?? 0).toLocaleString("ar-EG")}
          iconName="graduation"
          tone="blue"
          hint="مسجلون في الفترة"
        />
        <StatsCard
          title="جلسات مكتملة"
          value={loading ? "…" : (summary?.completed_sessions ?? 0).toLocaleString("ar-EG")}
          iconName="check"
          tone="accent"
          hint="جلسات منتهية"
        />
        <StatsCard
          title="متوسط التقييم"
          value={loading ? "…" : <RatingStars value={summary?.avg_rating} />}
          iconName="star"
          tone="warning"
          hint="من تقييمات الطلاب"
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-text">الإيرادات الشهرية</h3>
            <p className="text-sm text-text-muted">
              مقارنة إيرادات المنصة (أخضر) مع المسحوبات المدفوعة (أزرق) — {periodLabel}
            </p>
          </div>
          <div className="flex gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#22c55e]" />
              إيرادات المنصة
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" />
              المسحوبات
            </span>
          </div>
        </div>
        <RevenueChart data={monthlyRevenue} loading={loading} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-bold text-text">أفضل 5 مدرسين</h3>
          <p className="mb-4 text-sm text-text-muted">حسب إجمالي الأرباح في {periodLabel}</p>
          <DataTable
            columns={teacherColumns}
            data={topTeachers.map((row) => ({ ...row, _key: `teacher-${row.rank}` }))}
            loading={loading}
            emptyMessage="لا توجد بيانات مدرسين لهذه الفترة"
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-bold text-text">أفضل 5 مواد</h3>
          <p className="mb-4 text-sm text-text-muted">حسب عدد الطلاب المسجلين في الجلسات</p>
          <DataTable
            columns={subjectColumns}
            data={topSubjects.map((row) => ({ ...row, _key: `subject-${row.rank}` }))}
            loading={loading}
            emptyMessage="لا توجد بيانات مواد لهذه الفترة"
          />
        </section>
      </div>
    </div>
  );
}
