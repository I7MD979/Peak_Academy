"use client";

import { cn } from "@/lib/utils";

export default function ParentChildCard({ child, active, onClick }) {
  const initial = (child?.full_name || "ط").trim().slice(0, 1);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-[140px] flex-1 items-center gap-3 rounded-2xl border p-3 text-right transition-all",
        active
          ? "border-accent bg-accent text-white shadow-md"
          : "border-border bg-card text-text hover:border-accent/40 hover:shadow-sm"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-black",
          active ? "bg-white/20 text-white" : "bg-accent/10 text-accent"
        )}
      >
        {child?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={child.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{child?.full_name || "طالب"}</span>
        <span className={cn("block text-xs", active ? "text-white/80" : "text-text-muted")}>
          {child?.grade_label || "—"}
        </span>
      </span>
    </button>
  );
}
