"use client";

import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { Select } from "@/components/ui/Select";
import { PARENT_REPORT_PERIOD_LABELS, PARENT_REPORT_PERIODS } from "@/lib/parent-report";
import { parentCardSolid, parentFilterBar, parentMuted } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentReportFilters({
  linkedChildren = [],
  selectedId = "",
  onSelectedIdChange,
  period = "month",
  onPeriodChange,
  dateFrom = "",
  onDateFromChange,
  dateTo = "",
  onDateToChange
}) {
  const childOptions = linkedChildren.map((child) => ({
    value: child.id,
    label: `${child.full_name}${child.grade_label ? ` · ${child.grade_label}` : ""}`
  }));

  const periodLabel = PARENT_REPORT_PERIOD_LABELS[period] || PARENT_REPORT_PERIOD_LABELS.month;

  return (
    <section className={cn(parentCardSolid, "p-5")}>
      <div className="mb-4">
        <h2 className="text-lg font-black text-auth-on-surface">تصفية التقرير</h2>
        <p className={cn("mt-1 text-sm", parentMuted)}>اختر الطالب والفترة الزمنية لعرض الأداء</p>
      </div>

      <div className={cn(parentFilterBar, "grid gap-4 md:grid-cols-2 xl:grid-cols-4")}>
        <Select
          label="اختر الطالب"
          variant="dark"
          value={selectedId}
          onChange={(event) => onSelectedIdChange?.(event.target.value)}
          placeholder="اختر ابناً"
          options={childOptions}
        />

        <Select
          label="الفترة الزمنية"
          variant="dark"
          value={period}
          onChange={(event) => onPeriodChange?.(event.target.value)}
          options={PARENT_REPORT_PERIODS}
        />

        {period === "custom" ? (
          <>
            <CustomDatePicker
              label="من تاريخ"
              variant="dark"
              value={dateFrom}
              onChange={onDateFromChange}
              placeholder="اختر تاريخ البداية"
            />
            <CustomDatePicker
              label="إلى تاريخ"
              variant="dark"
              value={dateTo}
              onChange={onDateToChange}
              placeholder="اختر تاريخ النهاية"
            />
          </>
        ) : (
          <div className="flex items-end md:col-span-2">
            <p className={cn("w-full rounded-xl border border-auth-outline-variant/40 bg-auth-surface-low px-4 py-3 text-sm", parentMuted)}>
              يعرض التقرير بيانات <span className="font-bold text-auth-on-surface">{periodLabel}</span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
