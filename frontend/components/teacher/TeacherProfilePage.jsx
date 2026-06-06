"use client";

import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ProfileSecuritySection from "@/components/profile/ProfileSecuritySection";
import PageContainer from "@/components/shared/PageContainer";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import TeacherProfileAccountAside from "@/components/teacher/TeacherProfileAccountAside";
import TeacherProfileFormActions from "@/components/teacher/TeacherProfileFormActions";
import TeacherProfileHero from "@/components/teacher/TeacherProfileHero";
import TeacherProfilePersonalSection from "@/components/teacher/TeacherProfilePersonalSection";
import TeacherProfileProfessionalSection from "@/components/teacher/TeacherProfileProfessionalSection";
import TeacherProfileReviewsSection from "@/components/teacher/TeacherProfileReviewsSection";
import TeacherProfileStats from "@/components/teacher/TeacherProfileStats";
import { TEACHER_PROFILE_SECTION_TABS } from "@/lib/teacher-profile";
import { teacherErrorBox } from "@/lib/teacher-styles";

export default function TeacherProfilePage({
  profile,
  form,
  fieldErrors = {},
  stats,
  reviewsData,
  subjectsPreview = [],
  gradeOptions = [],
  subjectQuickOptions = [],
  section = "all",
  onSectionChange,
  loading = false,
  saving = false,
  refreshing = false,
  error = "",
  onRefresh,
  onChange,
  onToggleGrade,
  onAddSubject,
  onSubmit,
  onReset,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onPasswordSubmit,
  passwordSaving = false
}) {
  const showPersonal = section === "all" || section === "personal";
  const showProfessional = section === "all" || section === "professional";
  const showReviews = section === "all" || section === "reviews";
  const showSecurity = section === "all" || section === "security";
  const showExtras = section === "all";
  const showFormActions = showPersonal || showProfessional;

  if (loading && !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري تحميل الملف الشخصي..." />
      </div>
    );
  }

  return (
    <PageContainer>
      <AdminPageHeader
        eyebrow="ملفي الشخصي"
        title={profile?.full_name || "معلم Peak Academy"}
        subtitle={profile?.email || "—"}
        actions={[
          {
            label: refreshing || saving ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || saving || loading
          },
          {
            label: "الأرباح",
            icon: "wallet",
            variant: "secondary",
            href: "/teacher/earnings"
          },
          {
            label: "تحليلاتي",
            icon: "barChart",
            href: "/teacher/analytics"
          }
        ]}
      />

      {error ? (
        <div className={teacherErrorBox}>
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
          {showExtras ? (
            <>
              <TeacherProfileHero profile={profile} form={form} reviewsData={reviewsData} />
              <TeacherProfileStats stats={stats} />
            </>
          ) : null}

          <AdminFilterTabs
            tabs={TEACHER_PROFILE_SECTION_TABS}
            value={section}
            onChange={onSectionChange}
          />

          <form
            onSubmit={onSubmit}
            className={showExtras ? "grid gap-6 xl:grid-cols-3" : "space-y-6"}
          >
            <div className={showExtras ? "space-y-6 xl:col-span-2" : "space-y-6"}>
              {showPersonal ? (
                <TeacherProfilePersonalSection
                  profile={profile}
                  form={form}
                  fieldErrors={fieldErrors}
                  saving={saving}
                  onChange={onChange}
                />
              ) : null}

              {showProfessional ? (
                <TeacherProfileProfessionalSection
                  form={form}
                  fieldErrors={fieldErrors}
                  subjectsPreview={subjectsPreview}
                  gradeOptions={gradeOptions}
                  subjectQuickOptions={subjectQuickOptions}
                  saving={saving}
                  onChange={onChange}
                  onToggleGrade={onToggleGrade}
                  onAddSubject={onAddSubject}
                />
              ) : null}

              {showReviews ? <TeacherProfileReviewsSection reviewsData={reviewsData} /> : null}

              {showSecurity ? (
                <ProfileSecuritySection
                  variant="teacher"
                  disabled={saving}
                  password={password}
                  confirmPassword={confirmPassword}
                  onPasswordChange={onPasswordChange}
                  onConfirmPasswordChange={onConfirmPasswordChange}
                  onSubmit={onPasswordSubmit}
                  saving={passwordSaving}
                />
              ) : null}

              {showFormActions ? (
                <TeacherProfileFormActions saving={saving} onReset={onReset} />
              ) : null}
            </div>

            {showExtras ? (
              <TeacherProfileAccountAside
                profile={profile}
                form={form}
                subjectsPreview={subjectsPreview}
              />
            ) : null}
          </form>
        </>
      ) : null}
    </PageContainer>
  );
}
