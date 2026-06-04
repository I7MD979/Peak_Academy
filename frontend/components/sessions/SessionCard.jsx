"use client";

import SubjectBadge from "@/components/shared/SubjectBadge";
import LiveBadge from "@/components/shared/LiveBadge";
import EnrollButton from "@/components/enrollment/EnrollButton";
import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";
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
  const primaryHref = isLive ? liveLink : href;
  const canEnroll =
    showEnroll &&
    !session?.is_enrolled &&
    !session?.is_full &&
    session?.status === "scheduled";
  const price = Number(session?.price_per_student ?? session?.price ?? 0);

  return (
    <article
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-orange-500/30",
        isLive && "border-danger/30 bg-danger/5",
        className
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-sm font-bold text-orange-400">
          {(session?.teacher_name || "م")[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{session?.teacher_name || "مدرس Peak Academy"}</p>
          <p className="text-xs text-zinc-400">
            {session?.subject_name || "مادة"}
            {session?.grade_label ? ` — ${session.grade_label}` : ""}
          </p>
        </div>
        {isLive ? (
          <LiveBadge />
        ) : (
          <div className="text-left">
            <span className="font-bold text-orange-400">{session?.price_label || `${price} جنيه`}</span>
            <span className="block text-xs text-zinc-500">/ حصة</span>
          </div>
        )}
      </div>

      <h3 className="mb-2 font-bold">{session?.title || "جلسة تعليمية"}</h3>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <SubjectBadge name={session?.subject_name} icon={session?.subject_icon} />
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          {session?.scheduled_label || "—"}
        </span>
        {session?.is_enrolled ? (
          <span className="rounded-full bg-success/10 px-2.5 py-1 font-bold text-success">مسجل</span>
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
          <Button
            href={primaryHref}
            className="flex-1 rounded-xl"
            variant={isLive ? "destructive" : session?.is_enrolled ? "outline" : "accent"}
          >
            {isLive ? "دخول البث" : session?.is_enrolled ? "عرض الجلسة" : "احجز الآن"}
          </Button>
          {isLive ? (
            <Button href={href} variant="outline" className="rounded-xl px-3" aria-label="تفاصيل الجلسة">
              <Icon name="book" size={18} />
            </Button>
          ) : null}
        </div>
      )}
    </article>
  );
}
