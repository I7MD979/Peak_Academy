"use client";

import { parentMuted } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentSubjectProgressBar({ label, value, completed, total }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-auth-on-surface">{label}</span>
        <span className="font-black text-peak-orange">{clamped.toLocaleString("ar-EG")}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-auth-surface-low">
        <div
          className="h-full rounded-full bg-peak-orange transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className={cn("text-xs", parentMuted)}>
        {completed.toLocaleString("ar-EG")} جلسة مكتملة من {total.toLocaleString("ar-EG")}
      </p>
    </div>
  );
}
