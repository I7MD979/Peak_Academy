import { Button } from "@/components/ui/button";
import SubjectBadge from "@/components/shared/SubjectBadge";
import LiveBadge from "@/components/shared/LiveBadge";
import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

export default function SessionCard({ session, detailHref, liveHref, className }) {
  const href = detailHref || `/student/sessions/${session?.id || ""}`;
  const liveLink = liveHref || `/student/live/${session?.id || ""}`;
  const isLive = session?.is_live || session?.status === "live";
  const primaryHref = isLive ? liveLink : href;

  return (
    <article
      className={cn(
        "rounded-2xl border border-outline-variant/40 bg-surface-container p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        isLive && "border-danger/30 bg-danger/5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-on-surface">{session?.title || "جلسة تعليمية"}</h3>
          <p className="mt-1 truncate text-sm text-on-surface-variant">{session?.teacher_name || "مدرس Peak Academy"}</p>
        </div>
        {isLive ? <LiveBadge /> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SubjectBadge name={session?.subject_name} icon={session?.subject_icon} />
        {session?.is_enrolled ? (
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">مسجل</span>
        ) : null}
        {session?.free_trial_available && !session?.is_enrolled ? (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
            أول حصة مجانية
          </span>
        ) : null}
        {session?.low_seats && !session?.is_enrolled ? (
          <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">
            متاح {session.seats_left} أماكن فقط
          </span>
        ) : null}
        {session?.is_full ? (
          <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger">مكتملة</span>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-on-surface-variant">الموعد</dt>
          <dd className="font-semibold text-on-surface">{session?.scheduled_label || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">السعر</dt>
          <dd className="font-bold text-accent">{session?.price_label || "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-on-surface-variant">المقاعد</dt>
          <dd className="font-semibold text-on-surface">{session?.spots_label || "—"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
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
    </article>
  );
}
