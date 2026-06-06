"use client";

import Icon from "@/components/shared/Icon";
import { studentBtnPrimary, studentBtnSecondary } from "@/lib/student-styles";
import { cn } from "@/lib/utils";

export default function StudyRoomCard({ room, onJoin, joiningId, compact = false }) {
  const isFull = room?.is_full;
  const isActive = room?.status === "active";
  const busy = joiningId === room?.id;

  return (
    <article
      className={cn(
        "rounded-2xl border border-auth-outline-variant/40 bg-auth-surface-low p-4 transition-all hover:border-peak-orange/30",
        isActive && "border-success/30 bg-success/5",
        compact && "p-3"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-auth-on-surface">{room?.subject_label || "غرفة مذاكرة"}</h3>
          <p className="mt-1 text-sm text-auth-on-surface-variant">{room?.grade_label || "—"}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            isActive ? "bg-success/15 text-success" : "bg-accent-blue/15 text-accent-blue"
          )}
        >
          {room?.status_label || "متاحة"}
        </span>
      </div>

      <dl className={cn("mt-3 grid grid-cols-2 gap-2 text-sm", compact && "mt-2")}>
        <div>
          <dt className="text-xs text-auth-on-surface-variant">الأعضاء</dt>
          <dd className="font-bold text-auth-on-surface">
            {(room?.member_count ?? 0).toLocaleString("ar-EG")}/
            {(room?.capacity ?? 6).toLocaleString("ar-EG")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-auth-on-surface-variant">مقاعد متبقية</dt>
          <dd className={cn("font-bold", isFull ? "text-danger" : "text-success")}>
            {(room?.spots_left ?? 0).toLocaleString("ar-EG")}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        className={cn(
          isFull ? studentBtnSecondary : studentBtnPrimary,
          "mt-4 w-full justify-center py-2.5",
          (isFull || busy) && "pointer-events-none opacity-60"
        )}
        disabled={isFull || busy}
        onClick={() => onJoin?.(room)}
      >
        {busy ? (
          <>
            <Icon name="refresh" size={16} className="animate-spin" />
            جاري الانضمام…
          </>
        ) : isFull ? (
          "الغرفة ممتلئة"
        ) : (
          "انضم للغرفة"
        )}
      </button>
    </article>
  );
}
