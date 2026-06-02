"use client";

import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

export default function StudyRoomCard({ room, onJoin, joiningId, compact = false }) {
  const isFull = room?.is_full;
  const isActive = room?.status === "active";
  const busy = joiningId === room?.id;

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md",
        isActive && "border-success/30 bg-success/5",
        compact && "p-3"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-text">{room?.subject_label || "غرفة مذاكرة"}</h3>
          <p className="mt-1 text-sm text-text-muted">{room?.grade_label || "—"}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            isActive ? "bg-success/10 text-success" : "bg-accent-blue/10 text-accent-blue"
          )}
        >
          {room?.status_label || "متاحة"}
        </span>
      </div>

      <dl className={cn("mt-3 grid grid-cols-2 gap-2 text-sm", compact && "mt-2")}>
        <div>
          <dt className="text-xs text-text-muted">الأعضاء</dt>
          <dd className="font-bold text-text">
            {(room?.member_count ?? 0).toLocaleString("ar-EG")}/
            {(room?.capacity ?? 6).toLocaleString("ar-EG")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">مقاعد متبقية</dt>
          <dd className={cn("font-bold", isFull ? "text-danger" : "text-success")}>
            {(room?.spots_left ?? 0).toLocaleString("ar-EG")}
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        className="mt-4 w-full rounded-xl"
        variant={isFull ? "outline" : "accent"}
        disabled={isFull || busy}
        onClick={() => onJoin?.(room)}
      >
        {busy ? "جارٍ الانضمام..." : isFull ? "الغرفة ممتلئة" : "انضم للغرفة"}
      </Button>
    </article>
  );
}
