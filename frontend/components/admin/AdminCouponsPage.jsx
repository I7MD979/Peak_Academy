"use client";

import Icon from "@/components/shared/Icon";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminPagination from "@/components/admin/AdminPagination";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { Select } from "@/components/ui/Select";
import { adminBtnPrimary, adminBtnSecondary, adminCardSolid, adminErrorBox, adminInput } from "@/lib/admin-styles";
import { formatCurrencyEgp, formatDateAr } from "@/lib/format";
import { cn } from "@/lib/utils";

export const TYPE_LABELS = {
  coupon: "كوبون — خصم عام",
  bundle: "باقة — حصص/مزايا",
  early_bird: "طائر مبكر — محدود",
  referral: "إحالة — برنامج الإحالة"
};

export const DISCOUNT_LABELS = {
  percent: "نسبة مئوية (%)",
  fixed: "مبلغ ثابت (جنيه)",
  free_session: "حصة مجانية"
};

export const APPLIES_LABELS = {
  per_session: "حصة منفردة",
  subscription: "اشتراك شهري",
  all: "حصص + اشتراك"
};

export function formatDiscountValue(row) {
  if (row.discount_type === "percent") return `${row.discount_value}%`;
  if (row.discount_type === "fixed") return formatCurrencyEgp(row.discount_value);
  return "حصة مجانية";
}

export function isPromoExpired(row) {
  return Boolean(row.expires_at && new Date(row.expires_at) < new Date());
}

export function getPromoStatus(row) {
  if (isPromoExpired(row)) return "expired";
  return row.is_active ? "active" : "suspended";
}

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "جميع الأنواع" },
  { value: "coupon", label: "كوبون" },
  { value: "bundle", label: "باقة" },
  { value: "early_bird", label: "طائر مبكر" },
  { value: "referral", label: "إحالة" }
];

function UsageBar({ used, max }) {
  if (!max) {
    return (
      <span className="text-xs text-on-surface-variant">{used.toLocaleString("ar-EG")} استخدام</span>
    );
  }

  const pct = Math.min(100, (used / max) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-dim">
        <div
          className={cn("h-1.5 rounded-full transition-all", pct >= 100 ? "bg-error" : "bg-md-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-on-surface-variant" dir="ltr">
        {used} / {max}
      </span>
    </div>
  );
}

export default function AdminCouponsView({
  promos = [],
  stats = null,
  loading = false,
  statsLoading = false,
  error = "",
  filter = "all",
  onFilterChange,
  statusTabs = [],
  typeFilter = "",
  onTypeFilterChange,
  searchInput = "",
  onSearchChange,
  page = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  onRefresh,
  onAddPromo,
  onViewPromo,
  onEditPromo,
  onTogglePromo,
  onDeletePromo,
  onCopyPromo,
  onStatFilter,
  mutatingId = "",
  columns = []
}) {
  const statCards = [
    {
      key: "all",
      icon: "confirmation_number",
      label: "إجمالي العروض",
      value: statsLoading ? "…" : stats?.total ?? 0,
      tone: "default",
      filter: "all"
    },
    {
      key: "active",
      icon: "check_circle",
      label: "عروض نشطة",
      value: statsLoading ? "…" : stats?.active ?? 0,
      tone: "success",
      filter: "active"
    },
    {
      key: "inactive",
      icon: "pause_circle",
      label: "عروض موقوفة",
      value: statsLoading ? "…" : stats?.inactive ?? 0,
      tone: "warning",
      filter: "inactive"
    },
    {
      key: "expired",
      icon: "schedule",
      label: "عروض منتهية",
      value: statsLoading ? "…" : stats?.expired ?? 0,
      tone: "danger",
      filter: "expired"
    },
    {
      key: "uses",
      icon: "auto_graph",
      label: "مرات الاستخدام",
      value: statsLoading ? "…" : stats?.total_uses ?? 0,
      sub: stats ? formatCurrencyEgp(stats.total_discount_given) : null,
      tone: "blue",
      filter: null
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="التسويق"
        title="العروض والخصومات"
        subtitle="إنشاء أكواد الخصم وتتبع استخدامها. الأكواد تُتحقَّق عند الدفع ولا تُعرض على الصفحة الرئيسية."
        actions={[
          {
            label: "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: loading
          },
          {
            label: "إنشاء عرض",
            icon: "plus",
            onClick: onAddPromo
          }
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <AdminStatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={card.value}
            sub={card.sub}
            tone={card.tone}
            active={card.filter ? filter === card.filter : false}
            onClick={card.filter ? () => onStatFilter?.(card.filter) : undefined}
          />
        ))}
      </div>

      <section className={cn(adminCardSolid, "space-y-4 p-4 md:p-5")}>
        <AdminFilterTabs tabs={statusTabs} value={filter} onChange={onFilterChange} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative w-full max-w-md">
            <Icon name="search" size={16} className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-auth-on-surface-variant" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="بحث بكود العرض..."
              className={cn(adminInput, "ps-10")}
              aria-label="بحث في العروض"
            />
          </div>

          <Select
            label="نوع العرض"
            variant="dark"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange?.(e.target.value)}
            options={TYPE_FILTER_OPTIONS}
            className="w-full lg:w-56"
            aria-label="تصفية حسب نوع العرض"
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
        data={promos.map((row) => ({ ...row, _key: row.id }))}
        loading={loading}
        emptyMessage="لا توجد عروض مطابقة"
        emptyDescription="جرّب تغيير التصفية أو أنشئ عرضاً جديداً."
        variant="dark"
      />

      <AdminPagination
        page={page}
        totalPages={totalPages}
        loading={loading}
        totalLabel={`عرض ${promos.length} من ${totalCount.toLocaleString("ar-EG")} عرض`}
        onPrev={() => onPageChange?.(page - 1)}
        onNext={() => onPageChange?.(page + 1)}
      />
    </div>
  );
}

export function PromoCodeCell({ row, onCopy, onView }) {
  const expired = isPromoExpired(row);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onView?.(row)}
        className={cn(
          "rounded-lg border px-3 py-1 font-mono text-sm font-bold transition-colors hover:border-md-primary/50",
          row.is_active && !expired
            ? "border-md-primary/20 bg-md-primary/5 text-md-primary"
            : "border-outline-variant bg-surface-container-low text-on-surface-variant"
        )}
        dir="ltr"
      >
        {row.code}
      </button>
      <button
        type="button"
        className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-md-primary"
        onClick={() => onCopy?.(row)}
        aria-label="نسخ الكود"
      >
        <Icon name="copy" size={16} />
      </button>
    </div>
  );
}

export function PromoStatusCell({ row }) {
  const expired = isPromoExpired(row);
  if (expired) {
    return (
      <span className="inline-flex items-center rounded-full border border-error/20 bg-error/10 px-3 py-1 text-xs font-bold text-error">
        منتهي
      </span>
    );
  }
  return <StatusBadge status={row.is_active ? "active" : "suspended"} />;
}

export function PromoUsageCell({ row }) {
  const used = row.used_count ?? row.use_count ?? row.times_used ?? 0;
  return <UsageBar used={used} max={row.max_uses} />;
}
