"use client";

import AdminPersonalInfoFields from "@/components/admin/AdminPersonalInfoFields";
import AdminProfileAvatarPreview from "@/components/admin/AdminProfileAvatarPreview";
import AdminProfileHeader from "@/components/admin/AdminProfileHeader";
import AdminProfileSecuritySection from "@/components/admin/AdminProfileSecuritySection";
import AdminSectionCard from "@/components/admin/AdminSectionCard";
import {
  AdminProfileAccountSummary,
  AdminProfileErrorBanner,
  AdminProfileFallbackBanner,
  AdminProfileLoadingState,
  AdminProfileQuickLinks,
  AdminProfileSaveBar,
  AdminProfileStatsGrid
} from "@/components/admin/AdminProfilePage";
import PageContainer from "@/components/shared/PageContainer";
import { adminCardSolid } from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

export default function AdminProfileView({
  profile,
  form,
  fieldErrors,
  stats,
  statsLoading,
  statsError,
  loading,
  saving,
  error,
  isAuthFallback,
  displayName,
  displayAvatar,
  quickLinks,
  roleLabel,
  joinDateLabel,
  menuItems,
  onRefresh,
  onLoadStats,
  onChange,
  onSubmit,
  onReset
}) {
  const showContent = !loading && profile;

  return (
    <PageContainer compact className="space-y-6">
      <AdminProfileHeader
        eyebrow="إعدادات المشرف"
        title={displayName}
        subtitle={profile?.email || roleLabel}
        name={displayName}
        avatarUrl={displayAvatar}
        roleLabel={roleLabel}
        onRefresh={onRefresh}
        refreshing={loading || saving || statsLoading}
        menuItems={menuItems}
      />

      {isAuthFallback ? <AdminProfileFallbackBanner /> : null}
      {error ? <AdminProfileErrorBanner message={error} onRetry={onRefresh} /> : null}
      {loading ? <AdminProfileLoadingState /> : null}

      {showContent ? (
        <div className="space-y-6 animate-[fadeIn_0.35s_ease-out]">
          <AdminProfileStatsGrid
            stats={stats}
            loading={statsLoading}
            error={statsError}
            onRetry={onLoadStats}
          />

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <form onSubmit={onSubmit} className="space-y-4">
                <AdminSectionCard
                  title="البيانات الشخصية"
                  description="الاسم ورقم الهاتف والصورة الظاهرة في لوحة الإدارة والتقارير."
                  icon="user"
                >
                  <AdminPersonalInfoFields
                    form={form}
                    fieldErrors={fieldErrors}
                    email={profile.email}
                    onChange={onChange}
                    disabled={saving}
                  />
                </AdminSectionCard>

                <AdminProfileSaveBar saving={saving} onCancel={onReset} />
              </form>

              <AdminProfileSecuritySection disabled={saving} />
            </div>

            <aside className="space-y-4">
              <AdminSectionCard
                title="معاينة الصورة"
                description="كيف تظهر صورتك في القائمة والشريط العلوي."
                icon="user"
              >
                <AdminProfileAvatarPreview name={displayName} avatarUrl={displayAvatar} />
              </AdminSectionCard>

              <AdminProfileAccountSummary
                profile={profile}
                roleLabel={roleLabel}
                joinDateLabel={joinDateLabel}
              />

              <AdminProfileQuickLinks links={quickLinks} />

              <section
                className={cn(
                  adminCardSolid,
                  "border border-dashed border-md-primary/25 bg-md-primary/5 p-4 text-sm"
                )}
              >
                <p className="font-bold text-on-surface">نصيحة</p>
                <p className="mt-2 leading-relaxed text-on-surface-variant">
                  حدّث اسمك ورقم هاتفك ليتمكن الفريق من التواصل معك بسرعة عند الحاجة. استخدم كلمة مرور
                  قوية لا تقل عن 8 أحرف.
                </p>
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
