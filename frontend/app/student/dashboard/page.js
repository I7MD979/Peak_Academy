"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/admin/StatsCard";
import SessionCard from "@/components/shared/SessionCard";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import Icon from "@/components/shared/Icon";
import { studentApi } from "@/lib/api";
import { mapSessionForCard } from "@/lib/session-mapper";
const quickActions = [
  { href: "/student/sessions", label: "تصفح الجلسات", icon: "book", tone: "blue" },
  { href: "/student/ask", label: "اسأل مدرس", icon: "help", tone: "accent" },
  { href: "/student/study-rooms", label: "غرف المذاكرة", icon: "school", tone: "success" }
];

export default function StudentDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await studentApi.dashboard();
      setData(res?.data || null);
    } catch (err) {
      setData(null);
      setError(err.message || "تعذر تحميل الصفحة الرئيسية");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const profile = data?.profile;
  const stats = data?.stats;
  const liveSessions = (data?.live_sessions || []).map((s) => mapSessionForCard(s, { isEnrolled: true }));
  const upcomingSessions = (data?.upcoming_sessions || []).map((s) => mapSessionForCard(s, { isEnrolled: true }));
  const recommendedSessions = (data?.recommended_sessions || []).map((s) => mapSessionForCard(s, { isEnrolled: false }));

  const firstName = profile?.full_name?.split(" ")?.[0] || "بطل";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="page-hero">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/70">الصفحة الرئيسية</p>
            <h1 className="mt-1 text-2xl font-black">أهلاً {firstName}</h1>
            <p className="mt-2 text-sm text-white/75">
              {profile?.grade_label ? `صفك: ${profile.grade_label}` : "تابع تقدمك اليومي"} — استمر على الستريك
              ولا تفوّت جلساتك.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={loadDashboard}
            disabled={loading}
          >
            تحديث
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/15"
            >
              <Icon name={action.icon} size={18} className="text-accent" />
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-bold text-destructive">{error}</p>
          <Button type="button" className="mt-3" variant="outline" onClick={loadDashboard}>
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <LoadingSkeleton />
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="ستريك المذاكرة"
              value={`${(stats?.streak_days ?? 0).toLocaleString("ar-EG")} يوم`}
              iconName="trending"
              tone="accent"
              hint="واصل يوميًا لزيادة ستريكك"
            />
            <StatsCard
              title="جلساتي القادمة"
              value={(stats?.enrolled_upcoming ?? 0).toLocaleString("ar-EG")}
              iconName="calendarDays"
              tone="blue"
              hint="جلسات مسجل فيها"
            />
            <StatsCard
              title="جلسات مباشرة الآن"
              value={(stats?.live_now ?? 0).toLocaleString("ar-EG")}
              iconName="live"
              tone="warning"
              hint="يمكنك الدخول فورًا"
            />
            <StatsCard
              title="جلسات مكتملة"
              value={(stats?.completed_sessions ?? 0).toLocaleString("ar-EG")}
              iconName="check"
              tone="success"
              hint="إنجازاتك حتى الآن"
            />
          </section>

          {liveSessions.length > 0 ? (
            <section className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-danger">جلسة مباشرة الآن</h2>
                <span className="text-xs font-bold text-danger">انضم قبل انتهاء الوقت</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {liveSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-primary">جلساتي القادمة</h2>
                <p className="text-sm text-text-muted">الجلسات التي سجلت فيها بالفعل</p>
              </div>
              <Button href="/student/sessions" variant="outline" className="rounded-xl">
                عرض الكل
              </Button>
            </div>

            {upcomingSessions.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {upcomingSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا توجد جلسات قادمة مسجلة"
                description="تصفح الجلسات المتاحة واحجز جلسة جديدة للبدء."
              />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-primary">جلسات مقترحة لك</h2>
                <p className="text-sm text-text-muted">
                  {profile?.grade_label
                    ? `جلسات مناسبة لصف ${profile.grade_label}`
                    : "جلسات جديدة يمكنك حجزها"}
                </p>
              </div>
              <Button href="/student/sessions" className="rounded-xl">
                استكشف المزيد
              </Button>
            </div>

            {recommendedSessions.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {recommendedSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا توجد جلسات مقترحة حاليًا"
                description="جرّب لاحقًا أو تصفح كل الجلسات المتاحة."
              />
            )}
          </section>

          {profile?.link_code ? (
            <section className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-text-muted">
              <p className="font-bold text-text">كود ربط ولي الأمر</p>
              <p className="mt-1">
                شارك هذا الكود مع ولي أمرك:{" "}
                <span className="font-mono font-bold text-primary" dir="ltr">
                  {profile.link_code}
                </span>
              </p>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
