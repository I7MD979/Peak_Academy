"use client";

import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import Icon from "@/components/shared/Icon";
import { teacherBtnSecondary, teacherCardSolid, teacherInput, teacherMuted } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherSessionsFilters({
  status = "all",
  tabs = [],
  tabCounts = {},
  countsLoading = false,
  onStatusChange,
  search = "",
  onSearchChange,
  onSearchSubmit,
  loading = false
}) {
  const tabsWithBadges = tabs.map((tab) => ({
    ...tab,
    badge: countsLoading ? undefined : tabCounts[tab.key] > 0 ? tabCounts[tab.key] : undefined
  }));

  return (
    <section className={cn(teacherCardSolid, "space-y-4 p-4 md:p-5")}>
      <div>
        <h2 className="text-lg font-black text-auth-on-surface">تصفية الجلسات</h2>
        <p className={cn("mt-1 text-sm", teacherMuted)}>اختر الحالة وابحث بعنوان الجلسة</p>
      </div>

      <AdminFilterTabs
        tabs={tabsWithBadges}
        value={status}
        onChange={onStatusChange}
        className="max-w-full overflow-x-auto"
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit?.();
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-auth-on-surface-variant"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="ابحث بعنوان الجلسة..."
            className={cn(teacherInput, "h-11 ps-10")}
            disabled={loading}
            aria-label="بحث في الجلسات"
          />
        </div>
        <button type="submit" className={cn(teacherBtnSecondary, "h-11 shrink-0 px-6")}>
          بحث
        </button>
      </form>
    </section>
  );
}
