"use client";

import Icon from "@/components/shared/Icon";
import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminPagination from "@/components/admin/AdminPagination";
import DataTable from "@/components/admin/DataTable";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { Select } from "@/components/ui/Select";
import { adminBtnSecondary, adminErrorBox, adminInput } from "@/lib/admin-styles";
import { formatCurrencyEgp } from "@/lib/format";
import { PAGE_CONTAINER } from "@/lib/page-layout";
import { cn } from "@/lib/utils";

const METHOD_OPTIONS = [
  { value: "", label: "جميع الطرق" },
  { value: "vodafone_cash", label: "فودافون كاش" },
  { value: "instapay", label: "إنستاباي" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "bank", label: "تحويل بنكي" }
];

export default function AdminWithdrawalsPage({
  withdrawals = [],
  columns = [],
  loading = false,
  error = "",
  stats = null,
  statsLoading = false,
  statusFilter = "pending",
  onStatusFilterChange,
  statusTabs = [],
  methodFilter = "",
  onMethodFilterChange,
  searchInput = "",
  onSearchChange,
  requestedFrom = "",
  onRequestedFromChange,
  requestedTo = "",
  onRequestedToChange,
  onClearDates,
  page = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  onRefresh,
  onStatFilter
}) {
  const statCards = [
    {
      key: "pending",
      icon: "pending_actions",
      label: "طلبات معلقة",
      value: statsLoading ? "…" : stats?.pending ?? 0,
      sub: stats?.pending_amount != null ? formatCurrencyEgp(stats.pending_amount) : null,
      tone: "warning",
      filter: "pending"
    },
    {
      key: "approved",
      icon: "task_alt",
      label: "مقبولة",
      value: statsLoading ? "…" : stats?.approved ?? 0,
      tone: "blue",
      filter: "approved"
    },
    {
      key: "paid",
      icon: "payments",
      label: "مدفوعة",
      value: statsLoading ? "…" : stats?.paid ?? 0,
      tone: "success",
      filter: "paid"
    },
    {
      key: "rejected",
      icon: "block",
      label: "مرفوضة",
      value: statsLoading ? "…" : stats?.rejected ?? 0,
      tone: "danger",
      filter: "rejected"
    },
    {
      key: "all",
      icon: "receipt_long",
      label: "إجمالي الطلبات",
      value: statsLoading ? "…" : stats?.total ?? 0,
      tone: "default",
      filter: "all"
    }
  ];

  const hasDateFilter = Boolean(requestedFrom || requestedTo);

  return (
    <div className={PAGE_CONTAINER}>
      <AdminPageHeader
        eyebrow="المالية"
        title="طلبات السحب"
        subtitle="مراجعة ومعالجة طلبات سحب أرباح المدرسين. قبّل الطلب، سجّل الدفع، أو ارفض مع ذكر السبب."
        actions={[
          {
            label: "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: loading
          }
        ]}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {statCards.map((card) => (
          <AdminStatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={card.value}
            sub={card.sub}
            tone={card.tone}
            active={statusFilter === card.filter}
            onClick={() => onStatFilter?.(card.filter)}
          />
        ))}
      </div>

      {error ? <div className={adminErrorBox}>{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
        <div className="space-y-4 border-b border-outline-variant/20 bg-surface-container-low/80 p-4">
          <AdminFilterTabs tabs={statusTabs} value={statusFilter} onChange={onStatusFilterChange} />

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <Select
                variant="dark"
                className="w-44"
                label="طريقة السحب"
                value={methodFilter}
                onChange={(e) => onMethodFilterChange?.(e.target.value)}
                options={METHOD_OPTIONS}
                aria-label="تصفية حسب طريقة السحب"
              />
              <CustomDatePicker
                variant="dark"
                className="w-44"
                label="من تاريخ"
                value={requestedFrom}
                onChange={(e) => onRequestedFromChange?.(e.target.value)}
                placeholder="بداية الفترة"
              />
              <CustomDatePicker
                variant="dark"
                className="w-44"
                label="إلى تاريخ"
                value={requestedTo}
                onChange={(e) => onRequestedToChange?.(e.target.value)}
                placeholder="نهاية الفترة"
              />
              {hasDateFilter ? (
                <button type="button" className={cn(adminBtnSecondary, "h-11 px-4 text-xs")} onClick={onClearDates}>
                  مسح التاريخ
                </button>
              ) : null}
            </div>

            <div className="relative w-full max-w-sm">
              <Icon name="search" size={16} className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-auth-on-surface-variant" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="بحث بالمدرس أو رقم الحساب..."
                className={cn(adminInput, "h-11 ps-10")}
                aria-label="بحث طلبات السحب"
              />
            </div>
          </div>

          <p className="text-xs text-on-surface-variant">
            النتائج المطابقة:{" "}
            <span className="font-bold text-md-primary">{totalCount.toLocaleString("ar-EG")}</span> طلب
          </p>
        </div>

        <div className="p-2">
          <DataTable
            columns={columns}
            data={withdrawals}
            loading={loading}
            emptyMessage="لا توجد طلبات سحب"
            emptyDescription="جرّب تغيير التصفية أو البحث أو نطاق التاريخ"
            variant="dark"
            getRowClassName={() => "cursor-pointer"}
          />
        </div>

        <AdminPagination
          page={page}
          totalPages={totalPages}
          loading={loading}
          totalLabel={`عرض ${withdrawals.length} من ${totalCount.toLocaleString("ar-EG")} في هذه الصفحة`}
          onPrev={() => onPageChange?.(page - 1)}
          onNext={() => onPageChange?.(page + 1)}
          className="rounded-none border-0 border-t border-outline-variant/20 bg-surface-container-low/50"
        />
      </div>
    </div>
  );
}
