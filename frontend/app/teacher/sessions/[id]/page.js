"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import Icon from "@/components/shared/Icon";
import { sessionsApi } from "@/lib/api";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import { getEnrollmentCount, getSubjectLabel, gradeLabels } from "@/lib/teacher-sessions";

export default function TeacherSessionDetailPage({ params }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <main className="p-4 md:p-6">
        <LoadingSkeleton />
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="space-y-4 p-4 md:p-6">
        <Link href="/teacher/sessions" className="text-sm font-bold text-accent">
          العودة لجلساتي
        </Link>
        <EmptyState title={error || "الجلسة غير موجودة"} />
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
          <StatusBadge status={session.status} />
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
          <p className="font-bold text-accent">{formatCurrencyEgp(session.price_per_student)}</p>
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
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-bold text-text">{row.student_name}</p>
                  {row.student_email ? (
                    <p className="text-xs text-text-muted" dir="ltr">
                      {row.student_email}
                    </p>
                  ) : null}
                </div>
                <StatusBadge
                  status={row.status === "attended" ? "completed" : "scheduled"}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-muted">لا يوجد طلاب مسجلون بعد.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {session.status === "live" ? (
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl"
            onClick={() => router.push(`/teacher/live/${session.id}`)}
          >
            دخول البث
          </Button>
        ) : null}
        <Button type="button" variant="outline" className="rounded-xl" onClick={load}>
          تحديث
        </Button>
      </div>
    </main>
  );
}
