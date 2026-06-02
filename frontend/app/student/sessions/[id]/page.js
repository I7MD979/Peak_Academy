"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PaymentModal from "@/components/shared/PaymentModal";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/admin/StatusBadge";
import SubjectBadge from "@/components/shared/SubjectBadge";
import LiveBadge from "@/components/shared/LiveBadge";
import Icon from "@/components/shared/Icon";
import { studentApi } from "@/lib/api";
import { mapSessionForCard } from "@/lib/session-mapper";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function StudentSessionDetailsPage({ params }) {
  const [showPayment, setShowPayment] = useState(false);
  const [raw, setRaw] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await studentApi.session(params.id);
      const data = res?.data;
      setRaw(data);
      setSession(mapSessionForCard(data, { isEnrolled: data?.is_enrolled }));
    } catch (err) {
      setRaw(null);
      setSession(null);
      setError(err.message || "تعذر تحميل الجلسة");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (loading) {
    return (
      <main className="bg-bg p-4 md:p-6">
        <LoadingSkeleton />
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="space-y-4 bg-bg p-4 md:p-6">
        <Link
          href="/student/sessions"
          className="inline-flex items-center gap-1 text-sm font-bold text-accent"
        >
          <Icon name="arrowRight" size={16} />
          العودة للجلسات
        </Link>
        <EmptyState title={error || "الجلسة غير موجودة"} />
      </main>
    );
  }

  const isLive = raw?.status === "live";
  const canEnroll = raw?.can_enroll;
  const canJoinLive = raw?.can_join_live;
  const isEnrolled = raw?.is_enrolled;
  const isFull = raw?.is_full;
  const isCompleted = raw?.status === "completed";
  const isCancelled = raw?.status === "cancelled";

  return (
    <main className="space-y-6 bg-bg p-4 md:p-6">
      <Link
        href="/student/sessions"
        className="inline-flex items-center gap-1 text-sm font-bold text-accent hover:underline"
      >
        <Icon name="arrowRight" size={16} />
        العودة للجلسات
      </Link>

      <section
        className={cn(
          "rounded-2xl border border-border bg-card p-5 shadow-sm",
          isLive && "border-danger/30 bg-danger/5"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {isLive ? <LiveBadge /> : <StatusBadge status={raw?.status} />}
              {isEnrolled ? (
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                  مسجّل في الجلسة
                </span>
              ) : null}
              {isFull && !isEnrolled ? (
                <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger">
                  اكتمل العدد
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 text-2xl font-black text-text">{session.title}</h1>
            <p className="mt-1 text-sm text-text-muted">{session.teacher_name}</p>
          </div>
          <SubjectBadge name={session.subject_name} icon={session.subject_icon} />
        </div>

        {raw?.description ? (
          <p className="mt-4 rounded-xl bg-bg px-4 py-3 text-sm leading-relaxed text-text">
            {raw.description}
          </p>
        ) : null}

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-bg/50 p-3">
            <dt className="text-xs text-text-muted">الموعد</dt>
            <dd className="mt-1 text-sm font-bold text-text">
              {formatDateTimeAr(raw?.scheduled_at)}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-bg/50 p-3">
            <dt className="text-xs text-text-muted">السعر</dt>
            <dd className="mt-1 text-sm font-bold text-accent">
              {session.price_label || formatCurrencyEgp(session.price_per_student)}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-bg/50 p-3">
            <dt className="text-xs text-text-muted">المقاعد</dt>
            <dd className="mt-1 text-sm font-bold text-text">{session.spots_label}</dd>
          </div>
          <div className="rounded-xl border border-border bg-bg/50 p-3">
            <dt className="text-xs text-text-muted">الصف</dt>
            <dd className="mt-1 text-sm font-bold text-text">{raw?.grade_label || "—"}</dd>
          </div>
          {raw?.duration_min ? (
            <div className="rounded-xl border border-border bg-bg/50 p-3">
              <dt className="text-xs text-text-muted">المدة</dt>
              <dd className="mt-1 text-sm font-bold text-text">
                {raw.duration_min.toLocaleString("ar-EG")} دقيقة
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {canJoinLive ? (
            <Link href={`/student/live/${session.id}`}>
              <Button className="rounded-xl" variant="destructive">
                <Icon name="live" size={18} className="ml-2" />
                دخول البث المباشر
              </Button>
            </Link>
          ) : null}

          {canEnroll ? (
            <Button className="rounded-xl" variant="accent" onClick={() => setShowPayment(true)}>
              احجز وادفع الآن
            </Button>
          ) : null}

          {isEnrolled && !isLive && !isCompleted && !isCancelled ? (
            <p className="w-full rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
              أنت مسجّل في هذه الجلسة. ستتمكن من الدخول عند بدء المدرس البث المباشر.
            </p>
          ) : null}

          {isCompleted ? (
            <p className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
              هذه الجلسة منتهية. شكراً لمشاركتك.
            </p>
          ) : null}

          {isCancelled ? (
            <p className="w-full rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
              تم إلغاء هذه الجلسة.
            </p>
          ) : null}

          {isFull && !isEnrolled && raw?.status === "scheduled" ? (
            <p className="w-full rounded-xl bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
              اكتمل عدد المقاعد في هذه الجلسة. جرّب جلسة أخرى من القائمة.
            </p>
          ) : null}

          {!canEnroll && !canJoinLive && !isEnrolled && raw?.status === "scheduled" && !isFull ? (
            <p className="w-full rounded-xl bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
              موعد الجلسة قد مضى أو لا يمكن الحجز حالياً.
            </p>
          ) : null}
        </div>
      </section>

      {showPayment ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md animate-in fade-in">
            <PaymentModal session={session} onClose={() => setShowPayment(false)} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
