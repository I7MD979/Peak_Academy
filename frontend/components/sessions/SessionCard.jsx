"use client";

import Link from "next/link";
import SubjectBadge from "@/components/shared/SubjectBadge";
import LiveBadge from "@/components/shared/LiveBadge";
import EnrollButton from "@/components/enrollment/EnrollButton";
import Icon from "@/components/shared/Icon";
import { studentBtnPrimary, studentBtnSecondary } from "@/lib/student-styles";
import { cn } from "@/lib/utils";

export default function SessionCard({
  session,
  detailHref,
  liveHref,
  className,
  showEnroll = false
}) {
  const href = detailHref || `/student/sessions/${session?.id || ""}`;
  const liveLink = liveHref || `/student/live/${session?.id || ""}`;
  const isLive = session?.is_live || session?.status === "live";
  const canJoinLive = session?.can_join_live || isLive;
  const primaryHref = canJoinLive ? liveLink : href;
  const canEnroll =
    showEnroll &&
    !session?.is_enrolled &&
    !session?.is_full &&
    session?.status === "scheduled";
  const price = Number(session?.price_per_student ?? session?.price ?? 0);

  return (
    <article
      className={cn(
        "rounded-2xl border border-auth-outline-variant/40 bg-auth-surface-low p-5 transition-all hover:-translate-y-0.5 hover:border-peak-orange/30",
        isLive && "border-danger/35 bg-danger/5",
        className
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peak-orange/15 text-sm font-bold text-peak-orange">
          {(session?.teacher_name || "م")[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-auth-on-surface">
            {session?.teacher_name || "مدرس Peak Academy"}
          </p>
          <p className="text-xs text-auth-on-surface-variant">
            {session?.subject_name || "مادة"}
            {session?.grade_label ? ` — ${session.grade_label}` : ""}
          </p>
        </div>
        {isLive ? (
          <LiveBadge />
        ) : (
          <div className="text-left">
            <span className="font-bold text-peak-orange">{session?.price_label || `${price} جنيه`}</span>
            <span className="block text-xs text-auth-on-surface-variant">/ حصة</span>
          </div>
        )}
      </div>

      <h3 className="mb-2 font-black text-auth-on-surface">{session?.title || "جلسة تعليمية"}</h3>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <SubjectBadge name={session?.subject_name} icon={session?.subject_icon} />
        <span className="rounded-full border border-auth-outline-variant/30 bg-auth-surface-high px-3 py-1 text-auth-on-surface-variant">
          {session?.scheduled_label || "—"}
        </span>
        {session?.is_enrolled ? (
          <span className="rounded-full bg-success/15 px-2.5 py-1 font-bold text-success">مسجل</span>
        ) : null}
        {session?.is_full && !session?.is_enrolled ? (
          <span className="rounded-full bg-danger/15 px-2.5 py-1 font-bold text-danger">ممتلئة</span>
        ) : null}
      </div>

      {canEnroll ? (
        <EnrollButton
          sessionId={session.id}
          sessionPrice={price}
          teacherId={session.teacher_id}
          subjectId={session.subject_id}
          isFull={session.is_full}
        />
      ) : (
        <div className="flex gap-2">
          <Link
            href={primaryHref}
            className={cn(
              canJoinLive ? "bg-danger hover:brightness-110" : studentBtnPrimary,
              "flex-1 justify-center py-2.5"
            )}
          >
            {canJoinLive ? (
              <>
                <Icon name="live" size={18} />
                دخول البث
              </>
            ) : session?.is_enrolled ? (
              "عرض الجلسة"
            ) : (
              "احجز الآن"
            )}
          </Link>
          {isLive ? (
            <Link href={href} className={cn(studentBtnSecondary, "px-3 py-2.5")} aria-label="تفاصيل الجلسة">
              <Icon name="book" size={18} />
            </Link>
          ) : null}
        </div>
      )}
    </article>
  );
}
