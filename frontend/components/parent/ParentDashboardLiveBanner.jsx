"use client";

import Link from "next/link";
import Icon from "@/components/shared/Icon";
import { parentBtnPrimary, parentCardSolid, parentMuted } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentDashboardLiveBanner({ studentName = "", liveCount = 0, reportHref = "/parent/report" }) {
  if (!liveCount) return null;

  return (
    <section className="rounded-2xl border border-danger/40 bg-danger/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-danger" />
          </span>
          <div>
            <p className="font-black text-auth-on-surface">جلسة مباشرة الآن</p>
            <p className={cn("mt-1 text-sm", parentMuted)}>
              {studentName} لديه {liveCount.toLocaleString("ar-EG")}{" "}
              {liveCount === 1 ? "جلسة مباشرة" : "جلسات مباشرة"}
            </p>
          </div>
        </div>
        <Link href={reportHref} className={cn(parentBtnPrimary, "bg-danger hover:brightness-110")}>
          <Icon name="live" size={18} />
          عرض التفاصيل
        </Link>
      </div>
    </section>
  );
}
