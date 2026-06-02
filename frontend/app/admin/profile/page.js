"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/admin/StatsCard";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import PersonalInfoFields from "@/components/profile/PersonalInfoFields";
import ProfileErrorState from "@/components/profile/ProfileErrorState";
import ProfileHero from "@/components/profile/ProfileHero";
import { useAccountProfile } from "@/hooks/useAccountProfile";
import { dashboardApi } from "@/lib/api";
import { formatJoinDateAr, ROLE_LABELS_AR } from "@/lib/profile-form";
import { cn } from "@/lib/utils";

export default function AdminProfilePage() {
  const {
    profile,
    form,
    fieldErrors,
    loading,
    saving,
    error,
    loadProfile,
    handleChange,
    resetFormFromProfile,
    saveProfile
  } = useAccountProfile();

  const [stats, setStats] = useState(null);

  const loadAll = useCallback(async () => {
    await loadProfile();
    try {
      const res = await dashboardApi.adminStats();
      setStats(res?.data || null);
    } catch {
      setStats(null);
    }
  }, [loadProfile]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const ok = await saveProfile();
    if (ok) await loadAll();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ProfileHero
        eyebrow="إعدادات المشرف"
        title={profile?.full_name || "حسابي"}
        subtitle={profile?.email || ROLE_LABELS_AR.admin}
        name={form.full_name || profile?.full_name}
        avatarUrl={form.avatar_url || profile?.avatar_url}
        onRefresh={loadAll}
        refreshing={loading || saving}
      />

      {error ? <ProfileErrorState message={error} onRetry={loadAll} /> : null}

      {loading ? (
        <div className="glass-card p-4">
          <LoadingSkeleton />
        </div>
      ) : null}

      {!loading && profile ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="إجمالي المستخدمين"
              value={(stats?.total_users ?? 0).toLocaleString("ar-EG")}
              iconName="users"
              tone="blue"
            />
            <StatsCard
              title="جلسات مباشرة الآن"
              value={(stats?.live_sessions ?? 0).toLocaleString("ar-EG")}
              iconName="live"
              tone="accent"
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
          </section>

          <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <section className="glass-card space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-black text-text">البيانات الشخصية</h2>
                  <p className="mt-1 text-sm text-text-muted">معلومات حسابك كمشرف على المنصة.</p>
                </div>
                <PersonalInfoFields
                  form={form}
                  fieldErrors={fieldErrors}
                  email={profile.email}
                  onChange={handleChange}
                  disabled={saving}
                />
              </section>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="accent" className="rounded-xl" disabled={saving}>
                  {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={saving}
                  onClick={resetFormFromProfile}
                >
                  تراجع
                </Button>
              </div>
            </div>

            <aside className="space-y-4">
              <section className="glass-card p-5">
                <h3 className="text-lg font-black text-text">ملخص الحساب</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-muted">الدور</dt>
                    <dd className="font-bold">{ROLE_LABELS_AR.admin}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-muted">حالة الحساب</dt>
                    <dd className={cn("font-bold", profile.is_active !== false ? "text-success" : "text-destructive")}>
                      {profile.is_active !== false ? "نشط" : "موقوف"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-muted">تاريخ الانضمام</dt>
                    <dd className="font-bold">{formatJoinDateAr(profile.created_at)}</dd>
                  </div>
                </dl>
              </section>

              <section className="glass-card p-4">
                <h3 className="text-sm font-bold text-text">اختصارات الإدارة</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/admin/users">
                    <Button type="button" variant="outline" size="sm" className="rounded-xl">
                      <Icon name="users" size={16} />
                      المستخدمون
                    </Button>
                  </Link>
                  <Link href="/admin/sessions">
                    <Button type="button" variant="outline" size="sm" className="rounded-xl">
                      <Icon name="video" size={16} />
                      الجلسات
                    </Button>
                  </Link>
                  <Link href="/admin/dashboard">
                    <Button type="button" variant="outline" size="sm" className="rounded-xl">
                      <Icon name="dashboard" size={16} />
                      لوحة التحكم
                    </Button>
                  </Link>
                </div>
              </section>
            </aside>
          </form>
        </>
      ) : null}
    </div>
  );
}
