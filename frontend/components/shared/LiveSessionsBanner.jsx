"use client";

import Link from "next/link";
import Icon from "@/components/shared/Icon";
import { getProfileStyles } from "@/lib/profile-component-styles";
import { cn } from "@/lib/utils";

export default function LiveSessionsBanner({
  count = 0,
  variant = "student",
  href,
  onViewLive,
  label
}) {
  if (!count) return null;

  const styles = getProfileStyles(variant);
  const actionClass = cn(styles.btnPrimary, "bg-danger hover:brightness-110");

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-danger" />
        </span>
        <div>
          <p className="font-black text-auth-on-surface">
            {count.toLocaleString("ar-EG")} {count === 1 ? "جلسة مباشرة" : "جلسات مباشرة"} الآن
          </p>
          <p className={cn("text-sm", styles.muted)}>ادخل فوراً قبل انتهاء البث</p>
        </div>
      </div>
      {href ? (
        <Link href={href} className={actionClass}>
          <Icon name="live" size={18} />
          {label || "عرض الجلسات المباشرة"}
        </Link>
      ) : (
        <button type="button" onClick={onViewLive} className={actionClass}>
          <Icon name="live" size={18} />
          {label || "عرض الجلسات المباشرة"}
        </button>
      )}
    </div>
  );
}
