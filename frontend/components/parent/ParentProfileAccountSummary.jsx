"use client";

import Link from "next/link";
import Icon from "@/components/shared/Icon";
import { parentBtnSecondary, parentCardSolid, parentMuted } from "@/lib/parent-styles";
import { formatJoinDateAr, ROLE_LABELS_AR } from "@/lib/profile-form";
import { cn } from "@/lib/utils";

export default function ParentProfileAccountSummary({ profile }) {
  if (!profile) return null;

  return (
    <aside className={cn(parentCardSolid, "p-5")}>
      <h3 className="text-sm font-black text-auth-on-surface">ملخص الحساب</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between gap-2">
          <dt className={parentMuted}>الدور</dt>
          <dd className="font-bold text-auth-on-surface">{ROLE_LABELS_AR.parent}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className={parentMuted}>حالة الحساب</dt>
          <dd className={cn("font-bold", profile.is_active !== false ? "text-success" : "text-danger")}>
            {profile.is_active !== false ? "نشط" : "موقوف"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className={parentMuted}>تاريخ الانضمام</dt>
          <dd className="font-bold text-auth-on-surface">{formatJoinDateAr(profile.created_at)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/parent/report" className={parentBtnSecondary}>
          <Icon name="barChart" size={16} />
          التقارير
        </Link>
        <Link href="/parent/dashboard" className={parentBtnSecondary}>
          <Icon name="home" size={16} />
          الرئيسية
        </Link>
      </div>
    </aside>
  );
}
