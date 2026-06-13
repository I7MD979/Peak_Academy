"use client";

import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import PageContainer from "@/components/shared/PageContainer";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import Icon from "@/components/shared/Icon";
import {
  teacherBtnPrimary,
  teacherBtnSecondary,
  teacherCardSolid,
  teacherMuted
} from "@/lib/teacher-styles";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import {
  getEnrollmentCount,
  getStartAvailability,
  getSubjectLabel
} from "@/lib/teacher-session-detail";
import { gradeLabels } from "@/lib/teacher-sessions";
import { cn } from "@/lib/utils";

function StudentAvatar({ name, url }) {
  const initial = (name || "ط").trim().slice(0, 1);
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-auth-outline-variant/40 bg-auth-surface-high">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-auth-on-surface-variant">{initial}</span>
      )}
    </div>
  );
}

function DetailCell({ label, children }) {
  return (
    <div>
      <p className={cn("text-xs", teacherMuted)}>{label}</p>
      <p className="font-bold text-auth-on-surface">{children}</p>
    </div>
  );
}

export default function TeacherSessionDetailPage({
  session,
  enrollments = [],
  error = "",
  actionId = "",
  onReload,
  onStart,
  onEnd,
  onEnterLive
}) {
  if (error || !session) {
    return (
      <PageContainer compact>
        <Link href="/teacher/sessions" className="text-sm font-bold text-peak-orange">
          العودة لجلساتي
        </Link>
        <ErrorState message={error || "الجلسة غير موجودة"} onRetry={onReload} />
      </PageContainer>
    );
  }

  const enrolled = getEnrollmentCount(session);
  const startInfo = getStartAvailability(session);

  return (
    <PageContainer>
      <AdminPageHeader
        eyebrow="تفاصيل الجلسة"
        title={session.title}
        subtitle={getSubjectLabel(session)}
        actions={[
          {
            label: "جلساتي",
            icon: "video",
            variant: "secondary",
            href: "/teacher/sessions"
          },
          {
            label: "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onReload
          }
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={session.status} variant="session" />
      </div>

      <section className={cn(teacherCardSolid, "grid gap-3 p-5 sm:grid-cols-2")}>
        <DetailCell label="الموعد">{formatDateTimeAr(session.scheduled_at)}</DetailCell>
        <DetailCell label="الصف">{gradeLabels[session.grade] || "—"}</DetailCell>
        <DetailCell label="الطلاب">
          {enrolled.toLocaleString("ar-EG")}/{session.max_students?.toLocaleString("ar-EG") || "—"}
        </DetailCell>
        <DetailCell label="السعر">
          <span className="text-peak-orange">
            {formatCurrencyEgp(session.price_per_student ?? session.price ?? 80)}
          </span>
        </DetailCell>
      </section>

      {session.description ? (
        <section className={cn(teacherCardSolid, "p-4")}>
          <p className={cn("text-xs", teacherMuted)}>الوصف</p>
          <p className="mt-2 text-sm leading-relaxed text-auth-on-surface">{session.description}</p>
        </section>
      ) : null}

      <section className={cn(teacherCardSolid, "p-4")}>
        <h2 className="text-lg font-black text-auth-on-surface">الطلاب المسجلون</h2>
        {enrollments.length > 0 ? (
          <ul className="mt-3 divide-y divide-auth-outline-variant/30">
            {enrollments.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <StudentAvatar name={row.student_name} url={row.student_avatar_url} />
                  <div>
                    <p className="font-bold text-auth-on-surface">{row.student_name}</p>
                    <p className={cn("text-xs", teacherMuted)}>
                      تاريخ التسجيل: {formatDateTimeAr(row.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={row.payment_status === "paid" ? "paid" : "pending"} />
                  <StatusBadge
                    status={row.attendance === "attended" ? "completed" : "scheduled"}
                    variant="session"
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            iconName="users"
            title="لا يوجد طلاب مسجلون بعد"
            description="شارك رابط الجلسة مع طلابك لزيادة التسجيلات."
          />
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {session.status === "scheduled" ? (
          <button
            type="button"
            className={teacherBtnPrimary}
            disabled={actionId === "start" || !startInfo.canStart}
            title={startInfo.reason || undefined}
            onClick={onStart}
          >
            {actionId === "start" ? "جارٍ…" : "بدء الجلسة"}
          </button>
        ) : null}
        {session.status === "live" ? (
          <>
            <button type="button" className={teacherBtnPrimary} onClick={onEnterLive}>
              دخول البث
            </button>
            <button
              type="button"
              className={cn(teacherBtnSecondary, "border-danger/40 text-danger hover:bg-danger/10")}
              disabled={actionId === "end"}
              onClick={onEnd}
            >
              {actionId === "end" ? "جارٍ…" : "إنهاء الجلسة"}
            </button>
          </>
        ) : null}
        <button type="button" className={teacherBtnSecondary} onClick={onReload}>
          <Icon name="refresh" size={16} />
          تحديث
        </button>
      </div>
    </PageContainer>
  );
}
