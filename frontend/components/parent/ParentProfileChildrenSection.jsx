"use client";

import Link from "next/link";
import Icon from "@/components/shared/Icon";
import { Select } from "@/components/ui/Select";
import { buildParentChildReportHref } from "@/lib/parent-profile";
import {
  parentBtnPrimary,
  parentBtnSecondary,
  parentCardSolid,
  parentMuted
} from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

function ChildAvatar({ name, avatarUrl }) {
  const initial = (name || "ط").trim().slice(0, 1);

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-auth-outline-variant/40 bg-auth-surface-high text-lg font-black text-peak-orange">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

export default function ParentProfileChildrenSection({
  linkedChildren = [],
  selectedChildId = "",
  onSelectedChildChange,
  onGoToLinkSection
}) {
  const childOptions = linkedChildren.map((child) => ({
    value: child.id,
    label: `${child.full_name}${child.grade_label ? ` · ${child.grade_label}` : ""}`
  }));

  if (!linkedChildren.length) {
    return (
      <section className="rounded-2xl border border-warning/40 bg-warning/10 p-5">
        <p className="text-sm font-bold text-warning">لم تربط أي طالب بعد</p>
        <p className={cn("mt-1 text-sm", parentMuted)}>
          اطلب من ابنك كود الربط من صفحة «حسابي» في تطبيق الطالب، ثم أدخله في قسم «ربط طالب».
        </p>
        {onGoToLinkSection ? (
          <button type="button" className={cn(parentBtnSecondary, "mt-3")} onClick={onGoToLinkSection}>
            الذهاب لربط طالب
          </button>
        ) : null}
      </section>
    );
  }

  const selectedChild = linkedChildren.find((child) => child.id === selectedChildId);

  return (
    <section className={cn(parentCardSolid, "space-y-4 p-5")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-auth-on-surface">أبنائي المربوطون</h2>
          <p className={cn("mt-1 text-sm", parentMuted)}>اختر ابناً لعرض تقريره التفصيلي.</p>
        </div>
        {childOptions.length > 1 ? (
          <div className="w-full sm:max-w-xs">
            <Select
              label="انتقال سريع للتقرير"
              variant="dark"
              value={selectedChildId}
              onChange={(event) => onSelectedChildChange?.(event.target.value)}
              placeholder="اختر ابناً"
              options={childOptions}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {linkedChildren.map((child) => {
          const active = selectedChildId === child.id;
          return (
            <Link
              key={child.id}
              href={buildParentChildReportHref(child.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
                active
                  ? "border-peak-orange/60 bg-peak-orange/10 shadow-sm"
                  : "border-auth-outline-variant/40 bg-auth-surface-low hover:border-peak-orange/35"
              )}
              onClick={() => onSelectedChildChange?.(child.id)}
            >
              <ChildAvatar name={child.full_name} avatarUrl={child.avatar_url} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-auth-on-surface">
                  {child.full_name || "طالب"}
                </span>
                <span className={cn("block text-xs", parentMuted)}>{child.grade_label || "—"}</span>
              </span>
              <Icon name="arrowRight" size={18} className="shrink-0 text-auth-on-surface-variant" />
            </Link>
          );
        })}
      </div>

      {selectedChildId ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={buildParentChildReportHref(selectedChildId)} className={parentBtnPrimary}>
            <Icon name="barChart" size={18} />
            عرض تقرير {selectedChild?.full_name || "الطالب"}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
