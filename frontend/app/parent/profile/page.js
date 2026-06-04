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
import { parentApi } from "@/lib/api";
import { formatJoinDateAr, ROLE_LABELS_AR } from "@/lib/profile-form";
import { cn } from "@/lib/utils";

export default function ParentProfilePage() {
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

  const [children, setChildren] = useState([]);

  const loadChildren = useCallback(async () => {
    try {
      const res = await parentApi.children();
      setChildren(res?.data?.children || []);
    } catch {
      setChildren([]);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadProfile(), loadChildren()]);
  }, [loadProfile, loadChildren]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const ok = await saveProfile();
    if (ok) await loadAll();
  };

  return (
    <div className="space-y-6">
      <ProfileHero
        eyebrow="إعدادات ولي الأمر"
        title={profile?.full_name || "حسابي"}
        subtitle={
          children.length > 0
            ? `متابعة ${children.length.toLocaleString("ar-EG")} ${children.length === 1 ? "ابن" : "أبناء"} مربوطين`
            : "حدّث بياناتك واربط أبناءك لمتابعة تقدمهم"
        }
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
          <section className="grid gap-3 sm:grid-cols-3">
            <StatsCard
              title="الأبناء المربوطون"
              value={children.length.toLocaleString("ar-EG")}
              iconName="users"
              tone="accent"
              hint="من خلال كود الربط"
            />
            <StatsCard
              title="الدور"
              value={ROLE_LABELS_AR.parent}
              iconName="user"
              tone="blue"
            />
            <StatsCard
              title="عضو منذ"
              value={formatJoinDateAr(profile.created_at)}
              iconName="calendarDays"
              tone="success"
            />
          </section>

          {children.length > 0 ? (
            <section className="glass-card space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-text">أبنائي المربوطون</h2>
                  <p className="mt-1 text-sm text-text-muted">اضغط على ابن لعرض تقريره التفصيلي.</p>
                </div>
                <Button href="/parent/dashboard" type="button" variant="outline" size="sm" className="rounded-xl">
                  لوحة المتابعة
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {children.map((child) => {
                  const initial = (child?.full_name || "ط").trim().slice(0, 1);
                  return (
                    <Link
                      key={child.id}
                      href={`/parent/report?student=${child.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-accent/40 hover:shadow-sm"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent/10 text-lg font-black text-accent">
                        {child?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={child.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initial
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{child?.full_name || "طالب"}</span>
                        <span className="block text-xs text-text-muted">{child?.grade_label || "—"}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-sm font-bold text-warning">لم تربط أي طالب بعد</p>
              <p className="mt-1 text-sm text-text-muted">
                اطلب من ابنك كود الربط من صفحة «حسابي» في تطبيق الطالب، ثم أدخله من لوحة المتابعة.
              </p>
              <Button href="/parent/dashboard" type="button" variant="accent" size="sm" className="mt-3 rounded-xl">
                الذهاب لربط طالب
              </Button>
            </section>
          )}

          <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <section className="glass-card space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-black text-text">البيانات الشخصية</h2>
                  <p className="mt-1 text-sm text-text-muted">اسمك وبيانات التواصل الظاهرة في المنصة.</p>
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
                    <dd className="font-bold">{ROLE_LABELS_AR.parent}</dd>
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
                <h3 className="text-sm font-bold text-text">اختصارات</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button href="/parent/dashboard" type="button" variant="outline" size="sm" className="rounded-xl">
                    <Icon name="dashboard" size={16} />
                    الرئيسية
                  </Button>
                  <Button href="/parent/report" type="button" variant="outline" size="sm" className="rounded-xl">
                    <Icon name="book" size={16} />
                    التقارير
                  </Button>
                </div>
              </section>
            </aside>
          </form>
        </>
      ) : null}
    </div>
  );
}
