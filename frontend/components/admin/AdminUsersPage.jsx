"use client";

import Icon from "@/components/shared/Icon";
import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import DataTable from "@/components/admin/DataTable";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { Select } from "@/components/ui/Select";
import { adminBtnSecondary, adminErrorBox, adminInput } from "@/lib/admin-styles";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { PAGE_CONTAINER } from "@/lib/page-layout";
import { cn } from "@/lib/utils";

const ROLE_TABS = [
  { key: "", label: "الكل" },
  { key: "student", label: "طلاب" },
  { key: "teacher", label: "مدرسون" },
  { key: "parent", label: "أولياء أمور" },
  { key: "admin", label: "مشرفون" }
];

const STATUS_OPTIONS = [
  { value: "", label: "جميع الحالات" },
  { value: "active", label: "نشط" },
  { value: "suspended", label: "موقوف" }
];

export default function AdminUsersPage({
  users = [],
  columns = [],
  loading = false,
  error = "",
  stats = null,
  statsLoading = false,
  searchInput = "",
  onSearchChange,
  roleFilter = "",
  onRoleFilterChange,
  statusFilter = "",
  onStatusFilterChange,
  createdFrom = "",
  onCreatedFromChange,
  createdTo = "",
  onCreatedToChange,
  onClearDates,
  page = 1,
  totalPages = 1,
  totalUsers = 0,
  onPageChange,
  onRefresh,
  onStatFilter
}) {
  const statCards = [
    { key: "total", icon: "group", label: "إجمالي المستخدمين", value: statsLoading ? "…" : stats?.total ?? 0, tone: "default", filter: { role: "", status: "" } },
    { key: "students", icon: "school", label: "الطلاب", value: statsLoading ? "…" : stats?.students ?? 0, tone: "blue", filter: { role: "student", status: "" } },
    { key: "teachers", icon: "co_present", label: "المدرسون", value: statsLoading ? "…" : stats?.teachers ?? 0, tone: "orange", filter: { role: "teacher", status: "" } },
    { key: "parents", icon: "family_restroom", label: "أولياء الأمور", value: statsLoading ? "…" : stats?.parents ?? 0, tone: "purple", filter: { role: "parent", status: "" } },
    { key: "suspended", icon: "block", label: "حسابات موقوفة", value: statsLoading ? "…" : stats?.suspended ?? 0, tone: "danger", filter: { role: "", status: "suspended" } }
  ];

  const hasDateFilter = Boolean(createdFrom || createdTo);

  return (
    <div className={PAGE_CONTAINER}>
      <AdminPageHeader
        eyebrow="إدارة المنصة"
        title="المستخدمون"
        subtitle="مراقبة حسابات الطلاب والمدرسين وأولياء الأمور. ابحث، صفِّ، ونفّذ الإجراءات بأمان."
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
            tone={card.tone}
            active={
              (card.filter.role === roleFilter && card.filter.status === statusFilter) ||
              (card.key === "total" && !roleFilter && !statusFilter)
            }
            onClick={() => onStatFilter?.(card.filter)}
          />
        ))}
      </div>

      {error ? <div className={adminErrorBox}>{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
        <div className="space-y-4 border-b border-outline-variant/20 bg-surface-container-low/80 p-4">
          <AdminFilterTabs tabs={ROLE_TABS} value={roleFilter} onChange={onRoleFilterChange} />

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <Select
                variant="dark"
                className="w-44"
                label="الحالة"
                value={statusFilter}
                onChange={(e) => onStatusFilterChange?.(e.target.value)}
                options={STATUS_OPTIONS}
                aria-label="تصفية حسب الحالة"
              />
              <CustomDatePicker
                variant="dark"
                className="w-44"
                label="من تاريخ"
                value={createdFrom}
                onChange={(e) => onCreatedFromChange?.(e.target.value)}
                placeholder="اختر تاريخ البداية"
              />
              <CustomDatePicker
                variant="dark"
                className="w-44"
                label="إلى تاريخ"
                value={createdTo}
                onChange={(e) => onCreatedToChange?.(e.target.value)}
                placeholder="اختر تاريخ النهاية"
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
                placeholder="بحث بالاسم أو البريد الإلكتروني..."
                className={cn(adminInput, "h-11 ps-10")}
                aria-label="بحث المستخدمين"
              />
            </div>
          </div>

          <p className="text-xs text-on-surface-variant">
            النتائج المطابقة:{" "}
            <span className="font-bold text-md-primary">{totalUsers.toLocaleString("ar-EG")}</span> مستخدم
          </p>
        </div>

        <div className="p-2">
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            emptyMessage="لا يوجد مستخدمون"
            emptyDescription="جرّب تغيير معايير البحث أو التصفية أو نطاق التاريخ"
            variant="dark"
            getRowClassName={() => "cursor-pointer"}
          />
        </div>

        <AdminPagination
          page={page}
          totalPages={totalPages}
          loading={loading}
          totalLabel={`عرض ${users.length} من ${totalUsers.toLocaleString("ar-EG")} في هذه الصفحة`}
          onPrev={() => onPageChange?.(page - 1)}
          onNext={() => onPageChange?.(page + 1)}
          className="rounded-none border-0 border-t border-outline-variant/20 bg-surface-container-low/50"
        />
      </div>
    </div>
  );
}
