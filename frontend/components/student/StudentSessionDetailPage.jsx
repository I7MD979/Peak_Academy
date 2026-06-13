"use client";

import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import PageContainer from "@/components/shared/PageContainer";
import EmptyState from "@/components/shared/EmptyState";
import LiveBadge from "@/components/shared/LiveBadge";
import SubjectBadge from "@/components/shared/SubjectBadge";
import Icon from "@/components/shared/Icon";
import {
  studentBtnPrimary,
  studentBtnSecondary,
  studentCardSolid,
  studentMuted
} from "@/lib/student-styles";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

function DetailCell({ label, children }) {
  return (
    <div className="rounded-xl border border-auth-outline-variant/40 bg-auth-surface-low p-3">
      <dt className={cn("text-xs", studentMuted)}>{label}</dt>
      <dd className="mt-1 text-sm font-bold text-auth-on-surface">{children}</dd>
    </div>
  );
}

export default function StudentSessionDetailPage({
  session,
  raw,
  error = "",
  showPayment = false,
  onShowPayment,
  onClosePayment,
  onCancelEnrollment,
  onReload,
  paymentModal = null
}) {
  if (error || !session) {
    return (
      <PageContainer compact>
        <Link
          href="/student/sessions"
          className="inline-flex items-center gap-1 text-sm font-bold text-peak-orange"
        >
          <Icon name="arrowRight" size={16} />
          العودة للمحاضرات
        </Link>
        <EmptyState title={error || "المحاضرة غير موجودة"} />
      </PageContainer>
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
    <PageContainer>
      <AdminPageHeader
        eyebrow="تفاصيل المحاضرة"
        title={session.title}
        subtitle={session.teacher_name}
        actions={[
          {
            label: "المحاضرات",
            icon: "book",
            variant: "secondary",
            href: "/student/sessions"
          }
        ]}
      />

      <section
        className={cn(
          studentCardSolid,
          "space-y-5 p-5",
          isLive && "border-danger/40 bg-danger/10"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {isLive ? <LiveBadge /> : <StatusBadge status={raw?.status} />}
            {isEnrolled ? (
              <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
                مسجّل في المحاضرة
              </span>
            ) : null}
            {raw?.free_trial_available && !isEnrolled ? (
              <span className="rounded-full bg-peak-orange/15 px-2.5 py-1 text-xs font-bold text-peak-orange">
                أول حصة مجانية
              </span>
            ) : null}
            {raw?.low_seats && !isEnrolled ? (
              <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning">
                متاح {raw.seats_left} أماكن فقط
              </span>
            ) : null}
            {isFull && !isEnrolled ? (
              <span className="rounded-full bg-danger/15 px-2.5 py-1 text-xs font-bold text-danger">
                اكتمل العدد
              </span>
            ) : null}
          </div>
          <SubjectBadge name={session.subject_name} icon={session.subject_icon} />
        </div>

        {raw?.description ? (
          <p className="rounded-xl bg-auth-surface-low px-4 py-3 text-sm leading-relaxed text-auth-on-surface">
            {raw.description}
          </p>
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailCell label="الموعد">{formatDateTimeAr(raw?.scheduled_at)}</DetailCell>
          <DetailCell label="السعر">
            <span className="text-peak-orange">
              {session.price_label || formatCurrencyEgp(session.price_per_student)}
            </span>
          </DetailCell>
          <DetailCell label="المقاعد">{session.spots_label}</DetailCell>
          <DetailCell label="الصف">{raw?.grade_label || "—"}</DetailCell>
          {raw?.duration_min ? (
            <DetailCell label="المدة">{raw.duration_min.toLocaleString("ar-EG")} دقيقة</DetailCell>
          ) : null}
        </dl>

        {raw?.show_subscription_cta ? (
          <div className="rounded-xl border border-peak-orange/30 bg-peak-orange/10 p-4">
            <p className="text-sm font-bold text-auth-on-surface">وفّر مع الاشتراك الشهري</p>
            <p className={cn("mt-1 text-xs", studentMuted)}>
              بعد {raw.paid_session_count} حصص مدفوعة، الاشتراك الشهري أوفر من الدفع لكل حصة.
            </p>
            <Link href="/student/subscription" className="mt-3 inline-block text-sm font-bold text-peak-orange hover:underline">
              مقارنة خطط Silver و Gold
            </Link>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {canJoinLive ? (
            <Link href={`/student/live/${session.id}`} className={cn(studentBtnPrimary, "bg-danger hover:bg-danger/90")}>
              <Icon name="live" size={18} />
              دخول البث المباشر
            </Link>
          ) : null}

          {canEnroll ? (
            <button type="button" className={studentBtnPrimary} onClick={onShowPayment}>
              احجز وادفع الآن
            </button>
          ) : null}

          {isEnrolled && !canJoinLive && !isCompleted && !isCancelled ? (
            <>
              <p className="w-full rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                أنت مسجّل في هذه المحاضرة. ستتمكن من الدخول قبل موعد الحصة بـ 15 دقيقة.
              </p>
              <button type="button" className={studentBtnSecondary} onClick={onCancelEnrollment}>
                إلغاء التسجيل
              </button>
            </>
          ) : null}

          {isCompleted ? (
            <p className="w-full rounded-xl bg-auth-surface-low px-4 py-3 text-sm font-semibold text-auth-on-surface-variant">
              هذه المحاضرة منتهية. شكراً لمشاركتك.
            </p>
          ) : null}

          {isCancelled ? (
            <p className="w-full rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
              تم إلغاء هذه المحاضرة.
            </p>
          ) : null}

          {isFull && !isEnrolled && raw?.status === "scheduled" ? (
            <p className="w-full rounded-xl bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
              اكتمل عدد المقاعد في هذه المحاضرة. جرّب محاضرة أخرى من القائمة.
            </p>
          ) : null}

          {!canEnroll && !canJoinLive && !isEnrolled && raw?.status === "scheduled" && !isFull ? (
            <p className="w-full rounded-xl bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
              موعد المحاضرة قد مضى أو لا يمكن الحجز حالياً.
            </p>
          ) : null}
        </div>
      </section>

      {showPayment && paymentModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md animate-in fade-in">{paymentModal}</div>
        </div>
      ) : null}
    </PageContainer>
  );
}
