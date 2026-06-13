"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import DataTable from "@/components/admin/DataTable";
import RevenueChart from "@/components/admin/RevenueChart";
import { Select } from "@/components/ui/Select";
import { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import { adminCardSolid, adminErrorBox } from "@/lib/admin-styles";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { value: "month", label: "هذا الشهر" },
  { value: "3months", label: "آخر 3 شهور" },
  { value: "6months", label: "آخر 6 شهور" },
  { value: "year", label: "هذا العام" }
];

export default function AdminDashboardPage({
  adminName = "مشرف",
  stats,
  recentUsers = [],
  recentSessions = [],
  chartData = [],
  chartPeriod = "6months",
  onChartPeriodChange,
  userColumns = [],
  sessionColumns = [],
  loading = false,
  chartLoading = false,
  refreshing = false,
  error = "",
  onRefresh
}) {
  const router = useRouter();
  const liveCount = stats?.live_sessions ?? 0;
  const scheduledCount = stats?.scheduled_sessions ?? 0;

  const statCards = [
    {
      icon: "account_balance_wallet",
      label: "إجمالي الإيرادات",
      value: formatCurrencyEgp(stats?.total_revenue),
      tone: "success",
      href: "/admin/reports"
    },
    {
      icon: "group",
      label: "إجمالي المستخدمين",
      value: stats?.total_users ?? 0,
      tone: "blue",
      sub: "جميع الأدوار",
      href: "/admin/users"
    },
    {
      icon: "live_tv",
      label: "الجلسات المباشرة",
      value: liveCount,
      tone: liveCount > 0 ? "danger" : "default",
      live: liveCount > 0,
      sub: scheduledCount > 0 ? `${scheduledCount.toLocaleString("ar-EG")} مجدولة` : undefined,
      href: "/admin/sessions"
    },
    {
      icon: "pending_actions",
      label: "سحوبات معلقة",
      value: stats?.pending_withdrawals ?? 0,
      tone: "warning",
      sub: (stats?.pending_withdrawals ?? 0) > 0 ? "تحتاج مراجعة" : undefined,
      href: "/admin/withdrawals"
    }
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={`أهلاً بك، ${adminName}`}
        subtitle="نظرة عامة على أداء المنصة — المستخدمون، الجلسات، الإيرادات، والسحوبات."
        eyebrow="لوحة التحكم"
        actions={[
          {
            label: refreshing ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing
          },
          {
            label: "التقارير",
            icon: "barChart",
            variant: "secondary",
            href: "/admin/reports"
          },
          {
            label: "إدارة الجلسات",
            icon: "video",
            href: "/admin/sessions"
          }
        ]}
      />

      {error ? (
        <div className={adminErrorBox}>
          <p>{error}</p>
          {onRefresh ? (
            <button type="button" className="mt-3 text-sm font-bold text-peak-orange underline" onClick={onRefresh}>
              إعادة المحاولة
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !stats
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => (
              <AdminStatCard key={card.label} {...card} loading={loading} onClick={card.href ? undefined : card.onClick} />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className={cn(adminCardSolid, "p-6 lg:col-span-8")}>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-auth-on-surface">نمو الإيرادات</h2>
              <p className="mt-1 text-sm text-auth-on-surface-variant">مقارنة الإيرادات والمسحوبات حسب الفترة</p>
            </div>
            {onChartPeriodChange ? (
              <Select
                variant="dark"
                className="w-44"
                value={chartPeriod}
                onChange={(e) => onChartPeriodChange(e.target.value)}
                options={PERIOD_OPTIONS}
                aria-label="فترة الرسم البياني"
              />
            ) : null}
          </div>
          <RevenueChart data={chartData} loading={chartLoading} variant="dark" />
        </section>

        <section className={cn(adminCardSolid, "p-6 lg:col-span-4")}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-auth-on-surface">آخر التسجيلات</h2>
            <button
              type="button"
              className="text-xs font-bold text-md-primary hover:underline"
              onClick={() => router.push("/admin/users")}
            >
              عرض الكل
            </button>
          </div>
          <DataTable
            columns={userColumns}
            data={recentUsers}
            loading={loading}
            emptyMessage="لا يوجد مستخدمون حديثون"
            variant="dark"
          />
        </section>
      </div>

      <section className={cn(adminCardSolid, "p-6")}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-auth-on-surface">الجلسات القادمة</h2>
            <p className="mt-1 text-sm text-auth-on-surface-variant">أقرب الجلسات المجدولة على المنصة</p>
          </div>
          <button
            type="button"
            className="text-xs font-bold text-md-primary hover:underline"
            onClick={() => router.push("/admin/sessions")}
          >
            عرض الكل
          </button>
        </div>
        <DataTable
          columns={sessionColumns}
          data={recentSessions}
          loading={loading}
          emptyMessage="لا توجد جلسات مجدولة حالياً"
          variant="dark"
        />
      </section>
    </div>
  );
}
