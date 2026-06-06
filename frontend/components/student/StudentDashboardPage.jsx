"use client";

import Link from "next/link";
import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatsCard from "@/components/admin/StatsCard";
import SessionCard from "@/components/sessions/SessionCard";
import EmptyState from "@/components/shared/EmptyState";
import { SectionLoader, StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import {
  studentBtnPrimary,
  studentBtnSecondary,
  studentCardSolid,
  studentErrorBox,
  studentMuted
} from "@/lib/student-styles";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { href: "/student/sessions", label: "تصفح الجلسات", icon: "book", tone: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue" },
  { href: "/student/ask", label: "اسأل مدرس", icon: "help", tone: "border-peak-orange/30 bg-peak-orange/10 text-peak-orange" },
  { href: "/student/study-rooms", label: "غرف المذاكرة", icon: "school", tone: "border-success/30 bg-success/10 text-success" },
  { href: "/student/profile", label: "ملفي الشخصي", icon: "user", tone: "border-auth-outline-variant/40 bg-auth-surface-low text-auth-on-surface-variant" }
];

const SECTION_TABS = [
  { key: "all", label: "الكل" },
  { key: "live", label: "مباشرة الآن" },
  { key: "upcoming", label: "جلساتي القادمة" },
  { key: "recommended", label: "مقترحة لك" }
];

function LiveBanner({ count, onView }) {
  if (!count) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-danger" />
        </span>
        <div>
          <p className="font-black text-auth-on-surface">
            {count.toLocaleString("ar-EG")} {count === 1 ? "جلسة مباشرة" : "جلسات مباشرة"} الآن
          </p>
          <p className={cn("text-sm", studentMuted)}>ادخل فوراً قبل انتهاء البث</p>
        </div>
      </div>
      <button type="button" onClick={onView} className={cn(studentBtnPrimary, "bg-danger hover:bg-danger/90")}>
        <Icon name="live" size={18} />
        عرض الجلسات المباشرة
      </button>
    </div>
  );
}

function SessionGrid({ sessions, emptyTitle, emptyHint, showEnroll = false }) {
  if (!sessions?.length) {
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} showEnroll={showEnroll} />
      ))}
    </div>
  );
}

export default function StudentDashboardPage({
  profile,
  stats,
  liveSessions = [],
  upcomingSessions = [],
  recommendedSessions = [],
  section = "all",
  onSectionChange,
  loading = false,
  refreshing = false,
  error = "",
  onRefresh,
  onCopyLinkCode
}) {
  const firstName = profile?.full_name?.split(/\s+/)?.[0] || "بطل";
  const showLive = section === "all" || section === "live";
  const showUpcoming = section === "all" || section === "upcoming";
  const showRecommended = section === "all" || section === "recommended";

  if (loading && !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري تحميل لوحة الطالب..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="لوحة الطالب"
        title={`مرحباً، ${firstName}!`}
        subtitle={
          profile?.grade_label
            ? `${profile.grade_label}${profile.section ? ` — ${profile.section}` : ""}`
            : "أكمل ملفك الشخصي لتحصل على جلسات مناسبة لصفك"
        }
        actions={[
          {
            label: refreshing ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || loading
          },
          {
            label: "جلساتي",
            icon: "calendarDays",
            href: "/student/sessions?tab=mine"
          },
          {
            label: "تصفح الجلسات",
            icon: "book",
            href: "/student/sessions"
          }
        ]}
      />

      {error ? (
        <div className={studentErrorBox}>
          <p>{error}</p>
          {onRefresh ? (
            <button type="button" className="mt-2 text-sm font-bold text-peak-orange underline" onClick={onRefresh}>
              إعادة المحاولة
            </button>
          ) : null}
        </div>
      ) : null}

      {profile ? (
        <>
          <section className={cn(studentCardSolid, "relative overflow-hidden p-6 md:p-8")}>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-peak-orange/10 to-transparent" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-peak-orange/15 text-2xl font-black text-peak-orange">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    firstName.slice(0, 1)
                  )}
                </div>
                <div>
                  <p className="text-lg font-black text-auth-on-surface">{profile.full_name}</p>
                  <p className={cn("text-sm", studentMuted)}>
                    {profile.grade_label || "حدّد صفك من الملف الشخصي"}
                    {stats?.streak_days > 0 ? (
                      <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-400">
                        <Icon name="star" size={12} />
                        {stats.streak_days.toLocaleString("ar-EG")} يوم متتالي
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              {profile.link_code ? (
                <div className="rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low p-4">
                  <p className="text-xs font-bold text-auth-on-surface-variant">كود ربط ولي الأمر</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-lg bg-auth-surface-high px-3 py-1.5 font-mono text-sm text-peak-orange" dir="ltr">
                      {profile.link_code}
                    </code>
                    <button type="button" onClick={onCopyLinkCode} className={studentBtnSecondary}>
                      نسخ الكود
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <LiveBanner count={stats?.live_now ?? liveSessions.length} onView={() => onSectionChange?.("live")} />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatsCard
                  variant="dark"
                  title="جلسات قادمة"
                  value={(stats?.enrolled_upcoming ?? upcomingSessions.length).toLocaleString("ar-EG")}
                  iconName="calendarDays"
                  tone="blue"
                />
                <StatsCard
                  variant="dark"
                  title="مباشرة الآن"
                  value={(stats?.live_now ?? liveSessions.length).toLocaleString("ar-EG")}
                  iconName="live"
                  tone="accent"
                />
                <StatsCard
                  variant="dark"
                  title="جلسات مكتملة"
                  value={(stats?.completed_sessions ?? 0).toLocaleString("ar-EG")}
                  iconName="check"
                  tone="success"
                />
                <StatsCard
                  variant="dark"
                  title="أسئلتي"
                  value={(stats?.questions_total ?? 0).toLocaleString("ar-EG")}
                  iconName="help"
                  tone="warning"
                  hint={
                    stats?.questions_answered != null
                      ? `${stats.questions_answered.toLocaleString("ar-EG")} بإجابة`
                      : undefined
                  }
                />
              </>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5",
                  action.tone
                )}
              >
                <Icon name={action.icon} size={22} />
                <span className="font-bold">{action.label}</span>
              </Link>
            ))}
          </section>

          <AdminFilterTabs tabs={SECTION_TABS} value={section} onChange={onSectionChange} />

          {showLive ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-auth-on-surface">جلسات مباشرة</h2>
                {(stats?.live_now ?? liveSessions.length) > 0 ? (
                  <Link href="/student/sessions?tab=live" className="text-sm font-bold text-peak-orange hover:underline">
                    عرض الكل
                  </Link>
                ) : null}
              </div>
              <SessionGrid
                sessions={liveSessions}
                emptyTitle="لا توجد جلسات مباشرة الآن"
                emptyHint="عند بدء مدرسك الجلسة ستظهر هنا للدخول فوراً."
              />
            </section>
          ) : null}

          {showUpcoming ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-auth-on-surface">جلساتي القادمة</h2>
                <Link href="/student/sessions?tab=mine" className="text-sm font-bold text-peak-orange hover:underline">
                  كل جلساتي
                </Link>
              </div>
              <SessionGrid
                sessions={upcomingSessions}
                emptyTitle="لا توجد جلسات قادمة"
                emptyHint="تصفّح الجلسات المتاحة واحجز جلستك الأولى."
              />
            </section>
          ) : null}

          {showRecommended ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-auth-on-surface">مقترحة لصفك</h2>
                <Link href="/student/sessions" className="text-sm font-bold text-peak-orange hover:underline">
                  المزيد
                </Link>
              </div>
              <SessionGrid
                sessions={recommendedSessions}
                showEnroll
                emptyTitle="لا توجد جلسات مقترحة حالياً"
                emptyHint="جرّب تصفح جميع الجلسات أو عد لاحقاً."
              />
            </section>
          ) : null}

          {!profile.grade_label ? (
            <section className={cn(studentCardSolid, "flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}>
              <div>
                <p className="font-black text-auth-on-surface">أكمل ملفك الدراسي</p>
                <p className={cn("mt-1 text-sm", studentMuted)}>حدّد صفك لعرض جلسات مناسبة ومقترحات أدق.</p>
              </div>
              <Link href="/student/profile" className={studentBtnPrimary}>
                إكمال الملف
              </Link>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
