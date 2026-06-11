"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatsCard from "@/components/admin/StatsCard";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { StatCardSkeleton, SectionLoader } from "@/components/shared/LoadingSkeleton";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { Select } from "@/components/ui/Select";
import { teacherBtnSecondary, teacherCardSolid, teacherMuted } from "@/lib/teacher-styles";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#64748b"];

const PERIOD_OPTIONS = [
  { value: "month", label: "هذا الشهر" },
  { value: "3months", label: "آخر 3 شهور" },
  { value: "6months", label: "آخر 6 شهور" },
  { value: "year", label: "هذا العام" }
];

function DarkTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-bold text-on-surface">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {valueFormatter ? valueFormatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children, loading, empty, emptyMessage = "لا توجد بيانات للفترة المحددة" }) {
  return (
    <section className={cn(teacherCardSolid, "p-5 md:p-6")}>
      <div className="mb-4">
        <h3 className="text-lg font-black text-auth-on-surface">{title}</h3>
        {subtitle ? <p className={cn("mt-1 text-xs", teacherMuted)}>{subtitle}</p> : null}
      </div>
      {loading ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-auth-outline-variant/40 bg-auth-surface-low/50">
          <SectionLoader message="جاري تحميل الرسم..." />
        </div>
      ) : empty ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-auth-outline-variant/40 bg-auth-surface-low/30">
          <p className="text-sm text-auth-on-surface-variant">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export default function TeacherAnalyticsPage({
  data,
  loading = false,
  error = "",
  period = "6months",
  onPeriodChange,
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
  onClearDates,
  periodLabel = "",
  onRefresh,
  refreshing = false
}) {
  const sessionsTrend = data?.sessions_trend || [];
  const earningsMonth = data?.earnings_per_month || [];
  const subjects = data?.subject_distribution || [];

  const hasSessions = sessionsTrend.some((w) => (w.sessions ?? 0) > 0);
  const hasEarnings = earningsMonth.some((m) => (m.earnings ?? 0) > 0);
  const hasSubjects = subjects.some((s) => (s.value ?? 0) > 0);
  const hasAnyData =
    hasSessions ||
    hasEarnings ||
    hasSubjects ||
    (data?.unique_students ?? 0) > 0 ||
    (data?.completed_sessions ?? 0) > 0;

  const tickColor = "#a8acac";
  const gridColor = "rgba(88, 66, 53, 0.4)";

  if (!loading && !error && !hasAnyData) {
    return (
      <div>
        <EmptyState
          icon="📊"
          title="لا توجد تحليلات بعد"
          description="ستظهر إحصائياتك بعد إنشاء جلسات واستقبال طلاب."
          action={{ label: "إنشاء جلسة جديدة", href: "/teacher/sessions/new" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="تحليلاتي"
        title="إحصائيات أدائك التعليمي"
        subtitle="تابع جلساتك، أرباحك، وولاء طلابك — مع رسوم بيانية واضحة للفترة التي تختارها."
        actions={[
          {
            label: refreshing ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || loading
          },
          {
            label: "أرباحي",
            icon: "wallet",
            variant: "secondary",
            href: "/teacher/earnings"
          },
          {
            label: "جلساتي",
            icon: "calendarDays",
            href: "/teacher/sessions"
          }
        ]}
      />

      <div className={cn(teacherCardSolid, "space-y-4 p-4 md:p-5")}>
        <p className="text-xs font-bold text-auth-on-surface-variant">
          الفترة الحالية: <span className="text-peak-orange">{periodLabel || "—"}</span>
        </p>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <Select
              variant="dark"
              className="w-44"
              label="الفترة"
              value={period}
              onChange={(e) => onPeriodChange?.(e.target.value)}
              options={PERIOD_OPTIONS}
              aria-label="فترة التحليلات"
            />
            <CustomDatePicker
              variant="dark"
              className="w-44"
              label="من تاريخ"
              value={dateFrom}
              onChange={(e) => onDateFromChange?.(e.target.value)}
              placeholder="بداية مخصصة"
            />
            <CustomDatePicker
              variant="dark"
              className="w-44"
              label="إلى تاريخ"
              value={dateTo}
              onChange={(e) => onDateToChange?.(e.target.value)}
              placeholder="نهاية مخصصة"
            />
            {dateFrom || dateTo ? (
              <button type="button" className={cn(teacherBtnSecondary, "h-11 px-4 text-xs")} onClick={onClearDates}>
                مسح التاريخ
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={onRefresh} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !data ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              variant="dark"
              title="طلاب فريدون"
              value={(data?.unique_students ?? 0).toLocaleString("ar-EG")}
              iconName="users"
              tone="blue"
              hint="في الفترة المحددة"
            />
            <StatsCard
              variant="dark"
              title="طلاب متكررون"
              value={(data?.repeat_students ?? 0).toLocaleString("ar-EG")}
              iconName="user"
              tone="accent"
              hint={`نسبة الاحتفاظ: ${(data?.retention_rate ?? 0).toLocaleString("ar-EG")}%`}
            />
            <StatsCard
              variant="dark"
              title="متوسط التقييم"
              value={Number(data?.average_rating ?? 0).toFixed(1)}
              iconName="star"
              tone="warning"
              hint={`${(data?.review_count ?? 0).toLocaleString("ar-EG")} تقييم`}
            />
            <StatsCard
              variant="dark"
              title="أرباح الفترة"
              value={formatCurrencyEgp(data?.total_earnings ?? 0)}
              iconName="wallet"
              tone="success"
              hint={`${(data?.completed_sessions ?? 0).toLocaleString("ar-EG")} جلسة مكتملة`}
            />
          </>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="الجلسات" subtitle="عدد الجلسات خلال الفترة" loading={loading} empty={!hasSessions}>
          <div className="h-[280px] w-full min-w-0" dir="ltr">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sessionsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <Tooltip
                  content={
                    <DarkTooltip valueFormatter={(v) => `${Number(v).toLocaleString("ar-EG")} جلسة`} />
                  }
                />
                <Bar dataKey="sessions" name="جلسات" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="الأرباح الشهرية" subtitle="صافي أرباحك بعد العمولة" loading={loading} empty={!hasEarnings}>
          <div className="h-[280px] w-full min-w-0" dir="ltr">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={earningsMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 10 }} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
                <Tooltip content={<DarkTooltip valueFormatter={(v) => formatCurrencyEgp(v)} />} />
                <Legend formatter={(value) => <span className="text-xs text-on-surface-variant">{value}</span>} />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  name="الأرباح"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#f97316" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="توزيع الجلسات حسب المادة" subtitle="خلال الفترة المحددة" loading={loading} empty={!hasSubjects}>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div className="h-[300px] w-full min-w-0" dir="ltr">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subjects}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {subjects.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2 text-sm">
            {subjects.map((item, index) => (
              <li
                key={item.name}
                className="flex items-center justify-between rounded-lg border border-auth-outline-variant/30 bg-auth-surface-low px-3 py-2"
              >
                <span className="flex items-center gap-2 font-bold text-auth-on-surface">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="text-auth-on-surface-variant">{item.value.toLocaleString("ar-EG")} جلسة</span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      <p className="text-center text-xs text-auth-on-surface-variant">
        هل تريد تفاصيل أكثر؟{" "}
        <Link href="/teacher/earnings" className="font-bold text-peak-orange hover:underline">
          انتقل إلى صفحة الأرباح
        </Link>
      </p>
    </div>
  );
}
