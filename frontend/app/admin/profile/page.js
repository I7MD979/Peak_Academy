"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminSectionCard from "@/components/admin/AdminSectionCard";
import StatsCard from "@/components/admin/StatsCard";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import PersonalInfoFields from "@/components/profile/PersonalInfoFields";
import ProfileAvatarPreview from "@/components/profile/ProfileAvatarPreview";
import ProfileErrorState from "@/components/profile/ProfileErrorState";
import ProfileHero from "@/components/profile/ProfileHero";
import ProfileSecuritySection from "@/components/profile/ProfileSecuritySection";
import { useAccountProfile } from "@/hooks/useAccountProfile";
import { dashboardApi } from "@/lib/api";
import { formatJoinDateAr, ROLE_LABELS_AR } from "@/lib/profile-form";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { href: "/admin/users", label: "المستخدمون", icon: "users" },
  { href: "/admin/sessions", label: "الجلسات", icon: "video" },
  { href: "/admin/withdrawals", label: "طلبات السحب", icon: "creditCard" },
  { href: "/admin/reports", label: "التقارير", icon: "barChart" },
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: "dashboard" }
];

export default function AdminProfilePage() {
  const {
    profile,
    form,
    fieldErrors,
    loading,
    saving,
    error,
    isAuthFallback,
    loadProfile,
    handleChange,
    resetFormFromProfile,
    saveProfile
  } = useAccountProfile();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await dashboardApi.adminStats();
      setStats(res?.data || null);
    } catch {
      setStats(null);
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = async () => {
    await Promise.all([loadProfile(), loadStats()]);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const ok = await saveProfile();
    if (ok) await loadStats();
  };

  const displayName = form.full_name || profile?.full_name || "حسابي";
  const displayAvatar = form.avatar_url || profile?.avatar_url;
  const showContent = !loading && profile;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <ProfileHero
        eyebrow="إعدادات المشرف"
        title={displayName}
        subtitle={profile?.email || ROLE_LABELS_AR.admin}
        name={displayName}
        avatarUrl={displayAvatar}
        onRefresh={refreshAll}
        refreshing={loading || saving || statsLoading}
        refreshLabel="تحديث البيانات"
        actions={
          profile ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/25 px-4 py-1.5 text-xs font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              {ROLE_LABELS_AR.admin}
            </span>
          ) : null
        }
      />

      {isAuthFallback ? (
        <div
          className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm"
          role="status"
        >
          <Icon name="bell" size={20} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="font-bold text-warning">عرض مؤقت للبيانات</p>
            <p className="mt-1 leading-relaxed text-text-muted">
              تعذّر مزامنة الملف من الخادم. تأكد أن خادم التطبيق يعمل على المنفذ 4000 ثم اضغط «تحديث
              البيانات».
            </p>
          </div>
        </div>
      ) : null}

      {error ? <ProfileErrorState message={error} onRetry={refreshAll} /> : null}

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SectionLoader />
        </div>
      ) : null}

      {showContent ? (
        <div className="space-y-6 animate-[fadeIn_0.35s_ease-out]">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-text-muted">نظرة سريعة على المنصة</h2>
              {statsError ? (
                <button
                  type="button"
                  onClick={loadStats}
                  className="text-xs font-bold text-accent hover:underline"
                >
                  إعادة تحميل الإحصائيات
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                title="إجمالي المستخدمين"
                value={(stats?.total_users ?? 0).toLocaleString("ar-EG")}
                iconName="users"
                tone="blue"
                hint={statsLoading ? "جارٍ التحديث…" : statsError ? "تعذّر التحميل" : "مسجّلون على المنصة"}
              />
              <StatsCard
                title="جلسات مباشرة"
                value={(stats?.live_sessions ?? 0).toLocaleString("ar-EG")}
                iconName="live"
                tone="accent"
                hint="الآن"
              />
              <StatsCard
                title="طلبات سحب معلّقة"
                value={(stats?.pending_withdrawals ?? 0).toLocaleString("ar-EG")}
                iconName="creditCard"
                tone="warning"
              />
              <StatsCard
                title="إيرادات المنصة"
                value={`${Number(stats?.total_revenue ?? 0).toLocaleString("ar-EG")} ج.م`}
                iconName="wallet"
                tone="success"
              />
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <form onSubmit={onSubmit} className="space-y-4">
                <AdminSectionCard
                  title="البيانات الشخصية"
                  description="الاسم ورقم الهاتف والصورة الظاهرة في لوحة الإدارة والتقارير."
                  icon="user"
                >
                  <PersonalInfoFields
                    form={form}
                    fieldErrors={fieldErrors}
                    email={profile.email}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </AdminSectionCard>

                <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap gap-2 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
                  <Button type="submit" variant="accent" className="rounded-xl px-6" disabled={saving}>
                    {saving ? "جارٍ الحفظ…" : "حفظ التغييرات"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={saving}
                    onClick={resetFormFromProfile}
                  >
                    إلغاء التعديلات
                  </Button>
                </div>
              </form>

              <ProfileSecuritySection disabled={saving} />
            </div>

            <aside className="space-y-4">
              <AdminSectionCard title="معاينة الصورة" description="كيف تظهر صورتك في القائمة والشريط العلوي." icon="user">
                <ProfileAvatarPreview name={displayName} avatarUrl={displayAvatar} />
              </AdminSectionCard>

              <section className="glass-card rounded-2xl p-5">
                <h3 className="text-lg font-black text-text">ملخص الحساب</h3>
                <dl className="mt-4 divide-y divide-border text-sm">
                  <div className="flex justify-between gap-3 py-3">
                    <dt className="text-text-muted">الدور</dt>
                    <dd className="font-bold">{ROLE_LABELS_AR.admin}</dd>
                  </div>
                  <div className="flex justify-between gap-3 py-3">
                    <dt className="text-text-muted">البريد</dt>
                    <dd className="max-w-[58%] truncate font-bold" dir="ltr">
                      {profile.email || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-3">
                    <dt className="text-text-muted">حالة الحساب</dt>
                    <dd
                      className={cn(
                        "font-bold",
                        profile.is_active !== false ? "text-success" : "text-destructive"
                      )}
                    >
                      {profile.is_active !== false ? "نشط" : "موقوف"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-3">
                    <dt className="text-text-muted">التحقق</dt>
                    <dd className="font-bold">{profile.is_verified ? "موثّق" : "قيد التحقق"}</dd>
                  </div>
                  <div className="flex justify-between gap-3 py-3">
                    <dt className="text-text-muted">تاريخ الانضمام</dt>
                    <dd className="font-bold">{formatJoinDateAr(profile.created_at)}</dd>
                  </div>
                </dl>
              </section>

              <section className="glass-card rounded-2xl p-5">
                <h3 className="text-sm font-bold text-text">اختصارات سريعة</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {QUICK_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 rounded-xl border border-border bg-bg/50 px-3 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent/40 hover:bg-accent/5"
                    >
                      <Icon name={link.icon} size={16} className="text-accent" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-dashed border-accent/25 bg-gradient-to-br from-accent/5 to-transparent p-4 text-sm">
                <p className="font-bold text-text">نصيحة</p>
                <p className="mt-2 leading-relaxed text-text-muted">
                  حدّث اسمك ورقم هاتفك ليتمكن الفريق من التواصل معك بسرعة عند الحاجة.
                </p>
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}
