"use client";

import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import StatusBadge from "@/components/admin/StatusBadge";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { Select } from "@/components/ui/Select";
import { adminBtnPrimary, adminBtnSecondary, adminCardSolid, adminErrorBox, adminInput } from "@/lib/admin-styles";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "sort_order", label: "ترتيب العرض" },
  { value: "price_asc", label: "السعر: الأقل أولاً" },
  { value: "price_desc", label: "السعر: الأعلى أولاً" },
  { value: "subscribers", label: "الأكثر اشتراكاً" }
];

function StatCard({ icon, label, value, sub, tone = "default", active, onClick }) {
  const toneClasses = {
    default: "text-md-primary bg-md-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
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
      <h3 className="mt-1 text-2xl font-bold text-on-surface">
        {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
      </h3>
      {sub ? <p className="mt-1 text-xs font-bold text-md-primary">{sub}</p> : null}
    </button>
  );
}

function PlanCard({ plan, onView, onEdit, onToggle, onDelete, mutating }) {
  const features = plan.features || [];
  const featured = plan.is_featured;

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl p-6 transition-all duration-300",
        featured
          ? "border-2 border-md-primary bg-surface-container-high shadow-xl shadow-md-primary/10"
          : "border border-outline-variant bg-surface-container-low hover:border-md-primary/40"
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        {featured && plan.featured_label ? (
          <span className="rounded-full bg-md-primary px-3 py-1 text-xs font-black text-on-primary">
            {plan.featured_label}
          </span>
        ) : (
          <span className="text-xs font-bold text-on-surface-variant">#{plan.sort_order ?? 0}</span>
        )}
        <AdminActionsMenu
          disabled={mutating}
          items={[
            { label: "عرض التفاصيل", icon: "visibility", onClick: () => onView?.(plan) },
            { label: "تعديل الخطة", icon: "edit", onClick: () => onEdit?.(plan) },
            {
              label: plan.is_active ? "إيقاف الخطة" : "تفعيل الخطة",
              icon: plan.is_active ? "lock" : "unlock",
              onClick: () => onToggle?.(plan)
            },
            {
              label: "إيقاف نهائي",
              icon: "close",
              tone: "danger",
              onClick: () => onDelete?.(plan),
              disabled: (plan.active_subscribers || 0) > 0
            }
          ]}
        />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <span className="material-symbols-outlined text-3xl text-md-primary">
          {featured ? "stars" : "workspace_premium"}
        </span>
        <div>
          <h3 className="text-xl font-bold text-on-surface">{plan.name}</h3>
          <StatusBadge status={plan.is_active ? "active" : "suspended"} />
        </div>
      </div>

      <div className="mb-6">
        <span className="text-3xl font-black text-md-primary">{formatCurrencyEgp(plan.price)}</span>
        <span className="text-sm text-on-surface-variant"> / شهرياً</span>
        <p className="mt-1 text-xs text-on-surface-variant">
          {plan.sessions_per_month?.toLocaleString("ar-EG")} حصة شهرياً
        </p>
        {(plan.active_subscribers || 0) > 0 ? (
          <p className="mt-2 text-xs font-bold text-accent-blue">
            {plan.active_subscribers.toLocaleString("ar-EG")} مشترك نشط
          </p>
        ) : null}
      </div>

      {plan.description ? (
        <p className="mb-4 line-clamp-2 text-sm text-on-surface-variant">{plan.description}</p>
      ) : null}

      <ul className="mb-6 flex-grow space-y-3">
        {features.slice(0, 5).map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-on-surface">
            <span className="material-symbols-outlined text-sm text-md-primary">check_circle</span>
            {feature}
          </li>
        ))}
        {features.length > 5 ? (
          <li className="text-xs font-semibold text-on-surface-variant">
            +{features.length - 5} ميزات أخرى
          </li>
        ) : null}
      </ul>

      <button
        type="button"
        className={cn(adminBtnSecondary, "w-full justify-center py-2.5 text-sm")}
        onClick={() => onEdit?.(plan)}
        disabled={mutating}
      >
        تعديل الخطة
      </button>
    </article>
  );
}

export default function AdminSubscriptionsView({
  plans = [],
  stats = null,
  loading = false,
  statsLoading = false,
  error = "",
  statusFilter = "all",
  onStatusFilterChange,
  statusTabs = [],
  searchInput = "",
  onSearchChange,
  sortBy = "sort_order",
  onSortChange,
  onRefresh,
  onAddPlan,
  onViewPlan,
  onEditPlan,
  onTogglePlan,
  onDeletePlan,
  onStatFilter,
  mutatingId = ""
}) {
  const sortedPlans = [...plans].sort((a, b) => {
    if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
    if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
    if (sortBy === "subscribers") {
      return (b.active_subscribers || 0) - (a.active_subscribers || 0);
    }
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const statCards = [
    {
      key: "all",
      icon: "credit_card",
      label: "إجمالي الخطط",
      value: statsLoading ? "…" : stats?.total ?? 0,
      tone: "default",
      filter: "all"
    },
    {
      key: "active",
      icon: "check_circle",
      label: "خطط نشطة",
      value: statsLoading ? "…" : stats?.active ?? 0,
      tone: "success",
      filter: "active"
    },
    {
      key: "inactive",
      icon: "block",
      label: "خطط موقوفة",
      value: statsLoading ? "…" : stats?.inactive ?? 0,
      tone: "danger",
      filter: "inactive"
    },
    {
      key: "featured",
      icon: "stars",
      label: "خطط مميزة",
      value: statsLoading ? "…" : stats?.featured ?? 0,
      tone: "warning",
      filter: "featured"
    },
    {
      key: "subscriptions",
      icon: "groups",
      label: "اشتراكات نشطة",
      value: statsLoading ? "…" : stats?.active_subscriptions ?? 0,
      sub: "طلاب مشتركون حالياً",
      tone: "blue",
      filter: null
    }
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="الاشتراكات"
        title="خطط الاشتراك"
        subtitle="إدارة باقات الوصول، الأسعار، المميزات، وعرضها على صفحة الهبوط."
        actions={[
          {
            label: "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: loading
          },
          {
            label: "إضافة خطة",
            icon: "plus",
            onClick: onAddPlan
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
            active={card.filter ? statusFilter === card.filter : false}
            onClick={() => card.filter && onStatFilter?.(card.filter)}
          />
        ))}
      </div>

      <section className={cn(adminCardSolid, "space-y-4 p-4 md:p-5")}>
        <AdminFilterTabs tabs={statusTabs} activeKey={statusFilter} onChange={onStatusFilterChange} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-base text-on-surface-variant">
              search
            </span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="بحث بالاسم أو الوصف..."
              className={cn(adminInput, "ps-10")}
              aria-label="بحث في الخطط"
            />
          </div>

          <Select
            label="ترتيب العرض"
            variant="dark"
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value)}
            options={SORT_OPTIONS}
            className="w-full lg:w-56"
            aria-label="ترتيب الخطط"
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

      {loading ? (
        <div className={cn(adminCardSolid, "flex min-h-[40vh] items-center justify-center p-8")}>
          <SectionLoader message="جاري تحميل الخطط..." />
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className={cn(adminCardSolid, "border-dashed p-12 text-center")}>
          <p className="text-on-surface-variant">
            {searchInput ? "لا توجد خطط مطابقة للبحث." : "لا توجد خطط اشتراك. أنشئ الخطة الأولى."}
          </p>
          <button type="button" className={cn(adminBtnPrimary, "mt-4")} onClick={onAddPlan}>
            إنشاء خطة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              mutating={mutatingId === plan.id}
              onView={onViewPlan}
              onEdit={onEditPlan}
              onToggle={onTogglePlan}
              onDelete={onDeletePlan}
            />
          ))}
        </div>
      )}
    </div>
  );
}
