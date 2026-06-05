"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/admin/StatusBadge";
import { PageLoader } from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import Icon from "@/components/shared/Icon";
import { logApiError, sessionsApi } from "@/lib/api";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import { getEnrollmentCount, getStartAvailability, getSubjectLabel, gradeLabels } from "@/lib/teacher-sessions";

function StudentAvatar({ name, url }) {
  const initial = (name || "ط").trim().slice(0, 1);
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-text-muted">{initial}</span>
      )}
    </div>
  );
}

export default function TeacherSessionDetailPage({ params }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sessionRes, enrollRes] = await Promise.all([
        sessionsApi.get(params.id),
        sessionsApi.getEnrollments(params.id)
      ]);
      setSession(sessionRes?.data || null);
      setEnrollments(enrollRes?.data?.enrollments || []);
    } catch (err) {
      logApiError("teacher/session/detail", err);
      setSession(null);
      setEnrollments([]);
      setError(err.message || "تعذر تحميل الجلسة");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    const startInfo = getStartAvailability(session);
    if (!startInfo.canStart) {
      toast.error(startInfo.reason || "لا يمكن بدء الجلسة الآن");
      return;
    }
    try {
      setActionId("start");
      const res = await sessionsApi.start(params.id);
      const roomUrl = res?.data?.room_url;
      if (res?.data?.room_warning) toast.warning(res.data.room_warning);
      toast.success("تم بدء الجلسة");
      await load();
      if (roomUrl) window.open(roomUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      logApiError("teacher/session/start", err);
      toast.error(err.message || "تعذر بدء الجلسة");
    } finally {
      setActionId("");
    }
  };

  const handleEnd = async () => {
    const confirmed = window.confirm("هل تريد إنهاء الجلسة؟ سيتم تسجيل الحضور وحساب الأرباح.");
    if (!confirmed) return;
    try {
      setActionId("end");
      await sessionsApi.end(params.id);
      toast.success("تم إنهاء الجلسة وحساب الأرباح");
      await load();
    } catch (err) {
      logApiError("teacher/session/end", err);
      toast.error(err.message || "تعذر إنهاء الجلسة");
    } finally {
      setActionId("");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !session) {
    return (
      <main className="space-y-4 p-4 md:p-6">
        <Link href="/teacher/sessions" className="text-sm font-bold text-accent">
          العودة لجلساتي
        </Link>
        <ErrorState message={error || "الجلسة غير موجودة"} onRetry={load} />
      </main>
    );
  }

  const enrolled = getEnrollmentCount(session);

  return (
    <main className="space-y-6 p-4 md:p-6">
      <Link
        href="/teacher/sessions"
        className="inline-flex items-center gap-1 text-sm font-bold text-accent"
      >
        <Icon name="arrowRight" size={16} />
        العودة لجلساتي
      </Link>

      <section className="page-hero">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white/70">تفاصيل الجلسة</p>
            <h1 className="mt-1 text-2xl font-black">{session.title}</h1>
            <p className="mt-2 text-sm text-white/75">{getSubjectLabel(session)}</p>
          </div>
          <StatusBadge status={session.status} variant="session" />
        </div>
      </section>

      <section className="glass-card grid gap-3 p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs text-text-muted">الموعد</p>
          <p className="font-bold text-text">{formatDateTimeAr(session.scheduled_at)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">الصف</p>
          <p className="font-bold text-text">{gradeLabels[session.grade] || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">الطلاب</p>
          <p className="font-bold text-text">
            {enrolled.toLocaleString("ar-EG")}/{session.max_students?.toLocaleString("ar-EG") || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">السعر</p>
          <p className="font-bold text-accent">{formatCurrencyEgp(session.price_per_student ?? session.price)}</p>
        </div>
      </section>

      {session.description ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-text-muted">الوصف</p>
          <p className="mt-2 text-sm leading-relaxed text-text">{session.description}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-black text-text">الطلاب المسجلون</h2>
        {enrollments.length > 0 ? (
          <ul className="mt-3 divide-y divide-border">
            {enrollments.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <StudentAvatar name={row.student_name} url={row.student_avatar_url} />
                  <div>
                    <p className="font-bold text-text">{row.student_name}</p>
                    <p className="text-xs text-text-muted">
                      تاريخ التسجيل: {formatDateTimeAr(row.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={row.payment_status === "paid" ? "paid" : "pending"}
                  />
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
            icon="👥"
            title="لا يوجد طلاب مسجلون بعد"
            description="شارك رابط الجلسة مع طلابك لزيادة التسجيلات."
          />
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {session.status === "scheduled" ? (
          <Button
            type="button"
            className="rounded-xl"
            disabled={actionId === "start" || !getStartAvailability(session).canStart}
            title={getStartAvailability(session).reason || undefined}
            onClick={handleStart}
          >
            {actionId === "start" ? "جارٍ..." : "بدء الجلسة"}
          </Button>
        ) : null}
        {session.status === "live" ? (
          <>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => router.push(`/teacher/live/${session.id}`)}
            >
              دخول البث
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={actionId === "end"}
              onClick={handleEnd}
            >
              {actionId === "end" ? "جارٍ..." : "إنهاء الجلسة"}
            </Button>
          </>
        ) : null}
        <Button type="button" variant="outline" className="rounded-xl" onClick={load}>
          تحديث
        </Button>
      </div>
    </main>
  );
}
