"use client";

import AdminCheckbox from "@/components/admin/AdminCheckbox";
import Icon from "@/components/shared/Icon";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { Select } from "@/components/ui/Select";
import {
  studentBtnSecondary,
  studentCardSolid,
  studentFilterBar,
  studentInput,
  studentMuted
} from "@/lib/student-styles";
import { cn } from "@/lib/utils";

export default function StudentSessionsFilters({
  tab = "available",
  search = "",
  onSearchChange,
  onSearchSubmit,
  onlyMyGrade = true,
  onOnlyMyGradeChange,
  schoolLevel = "",
  onSchoolLevelChange,
  schoolLevelOptions = [],
  subject = "",
  onSubjectChange,
  subjectOptions = [],
  maxPrice = "",
  onMaxPriceChange,
  maxPriceOptions = [],
  dateFrom = "",
  onDateFromChange,
  dateTo = "",
  onDateToChange,
  onClearFilters,
  gradeLabel = "",
  loading = false,
  showDateFilters = true,
  totalCount = 0,
  hasActiveFilters = false
}) {
  return (
    <section className={cn(studentCardSolid, "space-y-4 p-4 md:p-5")}>
      <div>
        <h2 className="text-lg font-black text-auth-on-surface">تصفية المحاضرات</h2>
        <p className={cn("mt-1 text-sm", studentMuted)}>ابحث وحدّد المرحلة والمادة والسعر المناسبين لك</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit?.();
        }}
        className="flex flex-col gap-3 lg:flex-row lg:items-center"
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
            placeholder="ابحث بعنوان المحاضرة..."
            className={cn(studentInput, "h-11 ps-10")}
            aria-label="بحث في المحاضرات"
          />
        </div>
        <button type="submit" className={cn(studentBtnSecondary, "h-11 shrink-0 px-6")}>
          بحث
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Select
          variant="dark"
          label="المرحلة"
          value={schoolLevel}
          onChange={(event) => onSchoolLevelChange?.(event.target.value)}
          options={schoolLevelOptions}
          disabled={loading}
          aria-label="فلتر المرحلة الدراسية"
        />
        <Select
          variant="dark"
          label="المادة"
          value={subject}
          onChange={(event) => onSubjectChange?.(event.target.value)}
          options={subjectOptions}
          disabled={loading}
          aria-label="فلتر المادة"
        />
        <Select
          variant="dark"
          label="الحد الأقصى للسعر"
          value={maxPrice}
          onChange={(event) => onMaxPriceChange?.(event.target.value)}
          options={maxPriceOptions}
          disabled={loading}
          aria-label="فلتر السعر"
        />
        {tab === "available" ? (
          <AdminCheckbox
            id="only_my_grade"
            checked={onlyMyGrade}
            onChange={(event) => onOnlyMyGradeChange?.(event.target.checked)}
            label={gradeLabel ? `محاضرات صفّي (${gradeLabel})` : "محاضرات صفّي فقط"}
            disabled={loading || !gradeLabel}
          />
        ) : (
          <div className="hidden xl:block" aria-hidden />
        )}
      </div>

      {showDateFilters ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CustomDatePicker
            variant="dark"
            label="من تاريخ"
            value={dateFrom}
            onChange={(event) => onDateFromChange?.(event.target.value)}
            disabled={loading}
            placeholder="اختر تاريخ البداية"
          />
          <CustomDatePicker
            variant="dark"
            label="إلى تاريخ"
            value={dateTo}
            onChange={(event) => onDateToChange?.(event.target.value)}
            disabled={loading}
            placeholder="اختر تاريخ النهاية"
          />
        </div>
      ) : null}

      {hasActiveFilters ? (
        <div className={cn(studentFilterBar, "justify-between")}>
          <p className={cn("text-xs", studentMuted)}>
            فلاتر نشطة — {totalCount.toLocaleString("ar-EG")} نتيجة
          </p>
          <button type="button" onClick={onClearFilters} className={studentBtnSecondary}>
            مسح الفلاتر
          </button>
        </div>
      ) : null}
    </section>
  );
}
