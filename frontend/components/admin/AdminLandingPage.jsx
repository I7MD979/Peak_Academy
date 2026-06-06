"use client";

import Link from "next/link";
import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import DataTable from "@/components/admin/DataTable";
import { adminBtnSecondary, adminCardSolid, adminErrorBox, adminInput } from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

const FILTER_TABS = [
  { key: "all", label: "الكل" },
  { key: "visible", label: "ظاهرة" },
  { key: "hidden", label: "مخفية" }
];

const KEY_HINTS = {
  dashboards: "يظهر في بطاقات المميزات",
  teachers: "يظهر في عدّاد الـ Hero",
  sessions_monthly: "يظهر في عدّاد الـ Hero (جلسات)",
  sessions: "يظهر في عدّاد الـ Hero (جلسات)",
  rating: "يظهر في عدّاد الـ Hero (تقييم)"
};

function StatCard({ icon, label, value, sub, tone = "default", active, onClick, href }) {
  const toneClasses = {
    default: "text-md-primary bg-md-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    blue: "text-accent-blue bg-accent-blue/10"
  };

  const className = cn(
    "rounded-xl border p-5 text-start transition-all",
    active
      ? "border-md-primary bg-surface-container-high shadow-lg shadow-md-primary/10"
      : "border-outline-variant bg-surface-container-low hover:border-md-primary/40",
    (onClick || href) && "cursor-pointer"
  );

  const content = (
    <>
      <div className="mb-4 flex items-start justify-between">
        <div className={cn("rounded-lg p-2", toneClasses[tone] || toneClasses.default)}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
      <h3 className="mt-1 text-2xl font-bold text-on-surface">
        {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
      </h3>
      {sub ? <p className="mt-1 text-xs font-bold text-md-primary">{sub}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={className}>
      {content}
    </button>
  );
}

function LinkedSectionCard({ title, description, href, linkLabel, icon }) {
  return (
    <section className={cn(adminCardSolid, "p-5")}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-md-primary/10 text-md-primary">
            <span className="material-symbols-outlined">{icon}</span>
          </span>
          <h3 className="text-lg font-bold text-on-surface">{title}</h3>
        </div>
        <Link href={href} className={cn(adminBtnSecondary, "px-4 py-2 text-xs")}>
          {linkLabel}
        </Link>
      </div>
      <p className="text-sm leading-relaxed text-on-surface-variant">{description}</p>
    </section>
  );
}

export default function AdminLandingView({
  stats = [],
  overview = null,
  loading = false,
  overviewLoading = false,
  error = "",
  visibilityFilter = "all",
  onVisibilityFilterChange,
  searchInput = "",
  onSearchChange,
  onRefresh,
  columns = []
}) {
  const statCards = [
    {
      key: "all",
      icon: "analytics",
      label: "إجمالي الإحصائيات",
      value: overviewLoading ? "…" : overview?.total_stats ?? 0,
      tone: "default",
      filter: "all"
    },
    {
      key: "visible",
      icon: "visibility",
      label: "ظاهرة على الهبوط",
      value: overviewLoading ? "…" : overview?.visible_stats ?? 0,
      tone: "success",
      filter: "visible"
    },
    {
      key: "hidden",
      icon: "visibility_off",
      label: "مخفية",
      value: overviewLoading ? "…" : overview?.hidden_stats ?? 0,
      tone: "warning",
      filter: "hidden"
    },
    {
      key: "plans",
      icon: "workspace_premium",
      label: "خطط نشطة",
      value: overviewLoading ? "…" : overview?.active_plans ?? 0,
      sub: "تظهر في قسم الأسعار",
      tone: "blue",
      href: "/admin/subscriptions"
    },
    {
      key: "promos",
      icon: "sell",
      label: "عروض نشطة",
      value: overviewLoading ? "…" : overview?.active_promos ?? 0,
      sub: "تظهر في شريط الخصم",
      tone: "default",
      href: "/admin/promotions"
    }
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="المحتوى العام"
        title="صفحة الهبوط"
        subtitle="تحكم في الإحصائيات الظاهرة للزوار، وتابع الأقسام المرتبطة بالخطط والعروض."
        actions={[
          {
            label: "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: loading
          },
          {
            label: "معاينة الموقع",
            icon: "globe",
            href: "/",
            variant: "secondary"
          }
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={card.value}
            sub={card.sub}
            tone={card.tone}
            href={card.href}
            active={card.filter ? visibilityFilter === card.filter : false}
            onClick={card.filter ? () => onVisibilityFilterChange?.(card.filter) : undefined}
          />
        ))}
      </div>

      <section className={cn(adminCardSolid, "space-y-4 p-4 md:p-5")}>
        <div>
          <h3 className="text-lg font-bold text-on-surface">إحصائيات المنصة</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            تُعرض في بطاقات المميزات وعدّادات الـ Hero. المفاتيح الموصى بها:{" "}
            <span className="font-mono text-xs text-md-primary" dir="ltr">
              teachers, sessions_monthly, rating
            </span>
          </p>
        </div>

        <AdminFilterTabs tabs={FILTER_TABS} value={visibilityFilter} onChange={onVisibilityFilterChange} />

        <div className="relative max-w-md">
          <span className="material-symbols-outlined pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-base text-on-surface-variant">
            search
          </span>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="بحث بالعنوان أو المفتاح..."
            className={cn(adminInput, "ps-10")}
            aria-label="بحث في إحصائيات الهبوط"
          />
        </div>
      </section>

      {error ? (
        <div className={adminErrorBox}>
          <p>{error}</p>
          <button type="button" className={cn(adminBtnSecondary, "mt-3")} onClick={onRefresh}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={stats.map((row) => ({ ...row, _key: row.id }))}
        loading={loading}
        emptyMessage="لا توجد إحصائيات مطابقة"
        emptyDescription="جرّب تغيير التصفية أو تحديث الصفحة."
        variant="dark"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <LinkedSectionCard
          title="خطط الاشتراك"
          description="الخطط النشطة تُعرض تلقائياً في قسم الأسعار على صفحة الهبوط مع المميزات والتسمية المميزة."
          href="/admin/subscriptions"
          linkLabel="إدارة الخطط"
          icon="payments"
        />
        <LinkedSectionCard
          title="العروض والخصومات"
          description="الأكواد النشطة (غير المنتهية) تظهر في شريط الخصم أسفل قسم الأسعار."
          href="/admin/promotions"
          linkLabel="إدارة العروض"
          icon="confirmation_number"
        />
      </div>
    </div>
  );
}

export function LandingStatVisibilityCell({ row }) {
  return row.is_visible ? (
    <span className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-bold text-success">
      ظاهر
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-outline-variant bg-surface-container-highest px-3 py-1 text-xs font-bold text-on-surface-variant">
      مخفي
    </span>
  );
}

export function LandingStatKeyCell({ row }) {
  return (
    <div>
      <p className="font-mono text-xs text-md-primary" dir="ltr">
        {row.key}
      </p>
      {KEY_HINTS[row.key] ? (
        <p className="mt-1 text-xs text-on-surface-variant">{KEY_HINTS[row.key]}</p>
      ) : null}
    </div>
  );
}

export function LandingStatValueCell({ row }) {
  return (
    <span className="font-bold text-on-surface" dir="ltr">
      {row.value}
    </span>
  );
}
