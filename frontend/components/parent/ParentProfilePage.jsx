"use client";

import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ParentLinkStudentPanel from "@/components/parent/ParentLinkStudentPanel";
import ParentProfileAccountSummary from "@/components/parent/ParentProfileAccountSummary";
import ParentProfileChildrenSection from "@/components/parent/ParentProfileChildrenSection";
import ParentProfileFormActions from "@/components/parent/ParentProfileFormActions";
import ParentProfilePersonalSection from "@/components/parent/ParentProfilePersonalSection";
import ParentProfileSecuritySection from "@/components/parent/ParentProfileSecuritySection";
import ParentProfileStats from "@/components/parent/ParentProfileStats";
import { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import { PARENT_PROFILE_SECTION_TABS } from "@/lib/parent-profile";
import { parentBtnSecondary, parentErrorBox } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentProfilePage({
  profile,
  form,
  fieldErrors = {},
  linkedChildren = [],
  section = "all",
  onSectionChange,
  selectedChildId = "",
  onSelectedChildChange,
  linkCode = "",
  onLinkCodeChange,
  onLinkSubmit,
  linking = false,
  loading = false,
  saving = false,
  refreshing = false,
  error = "",
  onRefresh,
  onChange,
  onSubmit,
  onReset,
  password = "",
  confirmPassword = "",
  onPasswordChange,
  onConfirmPasswordChange,
  onPasswordSubmit,
  passwordSaving = false
}) {
  const showPersonal = section === "all" || section === "personal";
  const showChildren = section === "all" || section === "children";
  const showLink = section === "all" || section === "link";
  const showSecurity = section === "all" || section === "security";
  const showExtras = section === "all";

  if (loading && !profile) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="إعدادات ولي الأمر"
        title={profile?.full_name || "حسابي"}
        subtitle={
          linkedChildren.length > 0
            ? `متابعة ${linkedChildren.length.toLocaleString("ar-EG")} ${linkedChildren.length === 1 ? "ابن مربوط" : "أبناء مربوطين"}`
            : "حدّث بياناتك واربط أبناءك لمتابعة تقدمهم"
        }
        actions={[
          {
            label: refreshing || loading ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || loading || saving
          },
          {
            label: "الرئيسية",
            icon: "home",
            variant: "secondary",
            href: "/parent/dashboard"
          }
        ]}
      />

      {error ? (
        <div className={parentErrorBox}>
          <p className="text-sm font-bold text-danger">{error}</p>
          {onRefresh ? (
            <button type="button" className={cn(parentBtnSecondary, "mt-3")} onClick={onRefresh}>
              إعادة المحاولة
            </button>
          ) : null}
        </div>
      ) : null}

      {profile ? (
        <>
          {showExtras ? (
            <ParentProfileStats profile={profile} linkedChildrenCount={linkedChildren.length} />
          ) : null}

          <AdminFilterTabs tabs={PARENT_PROFILE_SECTION_TABS} value={section} onChange={onSectionChange} />

          {showLink ? (
            <ParentLinkStudentPanel
              linkCode={linkCode}
              onLinkCodeChange={onLinkCodeChange}
              onLinkSubmit={onLinkSubmit}
              linking={linking}
              inputId="parent-profile-link-code"
            />
          ) : null}

          {showChildren ? (
            <ParentProfileChildrenSection
              linkedChildren={linkedChildren}
              selectedChildId={selectedChildId}
              onSelectedChildChange={onSelectedChildChange}
              onGoToLinkSection={section !== "link" ? () => onSectionChange?.("link") : undefined}
            />
          ) : null}

          <form onSubmit={onSubmit} className="space-y-6">
            {showPersonal ? (
              <ParentProfilePersonalSection
                profile={profile}
                form={form}
                fieldErrors={fieldErrors}
                saving={saving}
                onChange={onChange}
                onAvatarUploaded={(url) => onChange?.("avatar_url")({ target: { value: url } })}
              />
            ) : null}

            {showSecurity ? (
              <ParentProfileSecuritySection
                variant="parent"
                idPrefix="parent"
                password={password}
                confirmPassword={confirmPassword}
                onPasswordChange={onPasswordChange}
                onConfirmPasswordChange={onConfirmPasswordChange}
                onSubmit={onPasswordSubmit}
                saving={passwordSaving}
                disabled={saving}
              />
            ) : null}

            {showPersonal ? <ParentProfileFormActions saving={saving} onReset={onReset} /> : null}
          </form>

          {showExtras ? <ParentProfileAccountSummary profile={profile} /> : null}
        </>
      ) : null}
    </div>
  );
}
