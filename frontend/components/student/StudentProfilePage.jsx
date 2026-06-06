"use client";

import Link from "next/link";
import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatsCard from "@/components/admin/StatsCard";
import ProfileSecuritySection from "@/components/profile/ProfileSecuritySection";
import StudentProfileAcademicSection from "@/components/student/StudentProfileAcademicSection";
import StudentProfileFormActions from "@/components/student/StudentProfileFormActions";
import StudentProfilePersonalSection from "@/components/student/StudentProfilePersonalSection";
import PageContainer from "@/components/shared/PageContainer";
import { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import { STUDENT_PROFILE_SECTION_TABS } from "@/lib/student-profile";
import {
  studentBtnSecondary,
  studentCardSolid,
  studentErrorBox,
  studentMuted
} from "@/lib/student-styles";
import { cn } from "@/lib/utils";

export default function StudentProfilePage({
  profile,
  form,
  fieldErrors = {},
  stats = {},
  subscriptionInfo = null,
  gradeOptions = [],
  section = "all",
  onSectionChange,
  loading = false,
  saving = false,
  refreshing = false,
  error = "",
  onRefresh,
  onChange,
  onSubmit,
  onReset,
  onCopyLinkCode,
  password = "",
  confirmPassword = "",
  onPasswordChange,
  onConfirmPasswordChange,
  onPasswordSubmit,
  passwordSaving = false
}) {
  const showPersonal = section === "all" || section === "personal";
  const showAcademic = section === "all" || section === "academic";
  const showSecurity = section === "all" || section === "security";
  const showExtras = section === "all";

  if (loading && !profile) {
    return (
      <PageContainer compact>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer compact className="space-y-8">
      <AdminPageHeader
        eyebrow="إعدادات الحساب"
        title="حسابي"
        subtitle={
          profile?.grade_label
            ? `${profile.full_name || "طالب"} · ${profile.grade_label}`
            : "حدّث بياناتك لتخصيص الجلسات والأسئلة"
        }
        actions={[
          {
            label: refreshing || saving ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || saving || loading
          },
          {
            label: "لوحتي",
            icon: "dashboard",
            href: "/student/dashboard"
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
          {!profile.profile_complete ? (
            <section className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
              <p className="text-sm font-bold text-warning">أكمل ملفك الدراسي</p>
              <p className={cn("mt-1 text-sm", studentMuted)}>
                حدّد صفك الدراسي لعرض الجلسات المناسبة وإرسال الأسئلة وغرف المذاكرة.
              </p>
            </section>
          ) : null}

          {showExtras ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                variant="dark"
                title="ستريك المذاكرة"
                value={`${(stats.streak_days ?? 0).toLocaleString("ar-EG")} يوم`}
                iconName="trending"
                tone="accent"
                hint="واصل يومياً"
              />
              <StatsCard
                variant="dark"
                title="جلسات قادمة"
                value={(stats.enrolled_upcoming ?? 0).toLocaleString("ar-EG")}
                iconName="calendarDays"
                tone="blue"
                hint="مسجّل فيها"
              />
              <StatsCard
                variant="dark"
                title="جلسات مكتملة"
                value={(stats.completed_sessions ?? 0).toLocaleString("ar-EG")}
                iconName="check"
                tone="success"
                hint="إنجازاتك"
              />
              <StatsCard
                variant="dark"
                title="أسئلتي"
                value={`${(stats.questions_answered ?? 0).toLocaleString("ar-EG")}/${(stats.questions_total ?? 0).toLocaleString("ar-EG")}`}
                iconName="help"
                tone="warning"
                hint="تم الرد / الإجمالي"
              />
            </section>
          ) : null}

          <AdminFilterTabs tabs={STUDENT_PROFILE_SECTION_TABS} value={section} onChange={onSectionChange} />

          {showExtras ? (
            <>
              <section className={cn(studentCardSolid, "flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}>
                <div>
                  <p className="font-black text-auth-on-surface">الاشتراك الشهري</p>
                  {subscriptionInfo?.subscription ? (
                    <p className={cn("mt-1 text-sm", studentMuted)}>
                      {subscriptionInfo.subscription.plan?.name || "نشط"} —{" "}
                      {subscriptionInfo.subscription.sessions_remaining} حصة متبقية
                    </p>
                  ) : (
                    <p className={cn("mt-1 text-sm", studentMuted)}>لا يوجد اشتراك نشط حالياً.</p>
                  )}
                </div>
                <Link href="/student/subscription" className={studentBtnSecondary}>
                  إدارة الاشتراك
                </Link>
              </section>

              {profile.link_code ? (
                <section className={cn(studentCardSolid, "flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}>
                  <div>
                    <p className="font-black text-auth-on-surface">كود ربط ولي الأمر</p>
                    <p className={cn("mt-1 text-sm", studentMuted)}>
                      شارك هذا الكود مع ولي أمرك لربط حسابك ومتابعة تقدمك.
                    </p>
                    <code className="mt-2 block font-mono text-lg font-black text-peak-orange" dir="ltr">
                      {profile.link_code}
                    </code>
                  </div>
                  <button type="button" onClick={onCopyLinkCode} className={studentBtnSecondary}>
                    نسخ الكود
                  </button>
                </section>
              ) : null}
            </>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-6">
            {showPersonal ? (
              <StudentProfilePersonalSection
                profile={profile}
                form={form}
                fieldErrors={fieldErrors}
                saving={saving}
                onChange={onChange}
                onAvatarUploaded={(url) => onChange?.("avatar_url")({ target: { value: url } })}
              />
            ) : null}

            {showAcademic ? (
              <StudentProfileAcademicSection
                form={form}
                fieldErrors={fieldErrors}
                gradeOptions={gradeOptions}
                saving={saving}
                onChange={onChange}
              />
            ) : null}

            {showSecurity ? (
              <ProfileSecuritySection
                variant="student"
                disabled={saving}
                password={password}
                confirmPassword={confirmPassword}
                onPasswordChange={onPasswordChange}
                onConfirmPasswordChange={onConfirmPasswordChange}
                onSubmit={onPasswordSubmit}
                saving={passwordSaving}
                idPrefix="student"
              />
            ) : null}

            {(showPersonal || showAcademic) && (
              <StudentProfileFormActions saving={saving} onReset={onReset} />
            )}
          </form>

          {showExtras ? (
            <section className={cn(studentCardSolid, "p-5")}>
              <h3 className="text-sm font-black text-auth-on-surface">اختصارات سريعة</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { href: "/student/sessions", label: "الجلسات", icon: "book" },
                  { href: "/student/ask", label: "اسأل مدرس", icon: "help" },
                  { href: "/student/study-rooms", label: "غرف المذاكرة", icon: "school" }
                ].map((link) => (
                  <Link key={link.href} href={link.href} className={cn(studentBtnSecondary, "gap-2")}>
                    <Icon name={link.icon} size={16} />
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
}
