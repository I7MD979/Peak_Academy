import Link from "next/link";
import { Button } from "@/components/ui/button";
import SubjectBadge from "@/components/shared/SubjectBadge";
import LiveBadge from "@/components/shared/LiveBadge";
import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

export default function SessionCard({ session, detailHref, className }) {
  const href = detailHref || `/student/sessions/${session?.id || ""}`;
  const isLive = session?.is_live || session?.status === "live";

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        isLive && "border-danger/30 bg-danger/5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-text">{session?.title || "جلسة تعليمية"}</h3>
          <p className="mt-1 truncate text-sm text-text-muted">{session?.teacher_name || "مدرس Peak Academy"}</p>
        </div>
        {isLive ? <LiveBadge /> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SubjectBadge name={session?.subject_name} icon={session?.subject_icon} />
        {session?.is_enrolled ? (
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">مسجل</span>
        ) : null}
        {session?.is_full ? (
          <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger">مكتملة</span>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-text-muted">الموعد</dt>
          <dd className="font-semibold text-text">{session?.scheduled_label || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">السعر</dt>
          <dd className="font-bold text-accent">{session?.price_label || "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-text-muted">المقاعد</dt>
          <dd className="font-semibold text-text">{session?.spots_label || "—"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
        <Link href={href} className="flex-1">
          <Button
            className="w-full rounded-xl"
            variant={isLive ? "destructive" : session?.is_enrolled ? "outline" : "accent"}
          >
            {isLive ? "دخول البث" : session?.is_enrolled ? "عرض الجلسة" : "احجز الآن"}
          </Button>
        </Link>
        {isLive ? (
          <Link href={`/student/live/${session.id}`}>
            <Button variant="outline" className="rounded-xl px-3" aria-label="دخول مباشر">
              <Icon name="live" size={18} />
            </Button>
          </Link>
        ) : null}
      </div>
    </article>
  );
}
