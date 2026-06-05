"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatsCard from "@/components/admin/StatsCard";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import PersonalInfoFields from "@/components/profile/PersonalInfoFields";
import ProfileErrorState from "@/components/profile/ProfileErrorState";
import ProfileHero from "@/components/profile/ProfileHero";
import { studentApi, subscriptionsApi } from "@/lib/api";
import { GRADE_OPTIONS, validateBaseProfile } from "@/lib/profile-form";
import { cn } from "@/lib/utils";

export default function StudentProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
    grade: "",
    section: ""
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await studentApi.profile();
      const data = res?.data || null;
      setProfile(data);
      try {
        const subRes = await subscriptionsApi.me();
        setSubscriptionInfo(subRes?.data || null);
      } catch {
        setSubscriptionInfo(null);
      }
      setForm({
        full_name: data?.full_name || "",
        phone: data?.phone || "",
        avatar_url: data?.avatar_url || "",
        grade: data?.grade || "",
        section: data?.section || ""
      });
    } catch (err) {
      setProfile(null);
      setError(err.message || "تعذر تحميل الملف الشخصي");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validateForm = () => {
    const errors = validateBaseProfile(form);
    if (!form.grade) errors.grade = "اختر صفك الدراسي";
    if (form.section.trim().length > 50) errors.section = "اسم الشعبة طويل جدًا";
    return errors;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("راجع الحقول المطلوبة");
      return;
    }

    setSaving(true);
    try {
      const res = await studentApi.updateProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || "",
        avatar_url: form.avatar_url.trim() || undefined,
        grade: form.grade,
        section: form.section.trim()
      });
      toast.success(res?.message || "تم حفظ التغييرات");
      await loadProfile();
    } catch (err) {
      toast.error(err.message || "تعذر حفظ الملف الشخصي");
    } finally {
      setSaving(false);
    }
  };

  const copyLinkCode = async () => {
    if (!profile?.link_code) return;
    try {
      await navigator.clipboard.writeText(profile.link_code);
      toast.success("تم نسخ كود الربط");
    } catch {
      toast.error("تعذر النسخ — انسخ الكود يدوياً");
    }
  };

  const stats = profile?.stats || {};

  return (
    <div className="space-y-6 p-4 md:p-6">
      <ProfileHero
        eyebrow="إعدادات الحساب"
        title="حسابي"
        subtitle={
          profile?.grade_label
            ? `${profile.full_name || "طالب"} · ${profile.grade_label}`
            : "حدّث بياناتك لتخصيص الجلسات والأسئلة"
        }
        name={profile?.full_name || form.full_name}
        avatarUrl={form.avatar_url || profile?.avatar_url}
        onRefresh={loadProfile}
        refreshing={loading || saving}
      />

      {error ? <ProfileErrorState message={error} onRetry={loadProfile} /> : null}

      {loading ? (
        <div className="glass-card p-4">
          <SectionLoader />
        </div>
      ) : null}

      {!loading && profile ? (
        <>
          {!profile.profile_complete ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-sm font-bold text-warning">أكمل ملفك الدراسي</p>
              <p className="mt-1 text-sm text-text-muted">
                حدد صفك الدراسي لعرض الجلسات المناسبة وإرسال الأسئلة وغرف المذاكرة.
              </p>
            </div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="ستريك المذاكرة"
              value={`${(stats.streak_days ?? 0).toLocaleString("ar-EG")} يوم`}
              iconName="trending"
              tone="accent"
              hint="واصل يومياً"
            />
            <StatsCard
              title="جلسات قادمة"
              value={(stats.enrolled_upcoming ?? 0).toLocaleString("ar-EG")}
              iconName="calendarDays"
              tone="blue"
              hint="مسجّل فيها"
            />
            <StatsCard
              title="جلسات مكتملة"
              value={(stats.completed_sessions ?? 0).toLocaleString("ar-EG")}
              iconName="check"
              tone="success"
              hint="إنجازاتك"
            />
            <StatsCard
              title="أسئلتي"
              value={`${(stats.questions_answered ?? 0).toLocaleString("ar-EG")}/${(stats.questions_total ?? 0).toLocaleString("ar-EG")}`}
              iconName="help"
              tone="warning"
              hint="تم الرد / الإجمالي"
            />
          </section>

          <section className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-text">الاشتراك الشهري</p>
              {subscriptionInfo?.subscription ? (
                <p className="mt-1 text-sm text-text-muted">
                  {subscriptionInfo.subscription.plan?.name || "نشط"} —{" "}
                  {subscriptionInfo.subscription.sessions_remaining} حصة متبقية
                </p>
              ) : (
                <p className="mt-1 text-sm text-text-muted">لا يوجد اشتراك نشط حالياً.</p>
              )}
            </div>
            <Button href="/student/subscription" variant="outline" className="shrink-0 rounded-xl">
              إدارة الاشتراك
            </Button>
          </section>

          {profile.link_code ? (
            <section className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-text">كود ربط ولي الأمر</p>
                <p className="mt-1 text-sm text-text-muted">
                  شارك هذا الكود مع ولي أمرك لربط حسابك ومتابعة تقدمك.
                </p>
                <p className="mt-2 font-mono text-lg font-black text-accent" dir="ltr">
                  {profile.link_code}
                </p>
              </div>
              <Button type="button" variant="outline" className="shrink-0 rounded-xl" onClick={copyLinkCode}>
                نسخ الكود
              </Button>
            </section>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-6">
            <section className="glass-card space-y-4 p-5">
              <div>
                <h2 className="text-lg font-black text-text">البيانات الشخصية</h2>
                <p className="mt-1 text-sm text-text-muted">الاسم ورقم الهاتف والصورة الظاهرة في المنصة.</p>
              </div>
              <PersonalInfoFields
                form={form}
                fieldErrors={fieldErrors}
                email={profile.email}
                onChange={handleChange}
                disabled={saving}
              />
            </section>

            <section className="glass-card space-y-4 p-5">
              <div>
                <h2 className="text-lg font-black text-text">البيانات الدراسية</h2>
                <p className="mt-1 text-sm text-text-muted">
                  تُستخدم لتصفية الجلسات والأسئلة وغرف المذاكرة حسب صفك.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>الصف الدراسي</Label>
                  <div className="flex flex-wrap gap-2">
                    {GRADE_OPTIONS.map((option) => {
                      const active = form.grade === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, grade: option.value }));
                            setFieldErrors((prev) => ({ ...prev, grade: "" }));
                          }}
                          className={cn(
                            "rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors",
                            active
                              ? "border-accent bg-accent text-white"
                              : "border-border bg-card text-text hover:border-accent/40"
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.grade ? (
                    <p className="text-xs text-destructive">{fieldErrors.grade}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">الشعبة (اختياري)</Label>
                  <Input
                    id="section"
                    value={form.section}
                    onChange={handleChange("section")}
                    placeholder="مثال: أ، ب، علمي"
                    className={cn(fieldErrors.section && "border-destructive")}
                  />
                  {fieldErrors.section ? (
                    <p className="text-xs text-destructive">{fieldErrors.section}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="accent" className="rounded-xl" disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </Button>
              <Button href="/student/dashboard" type="button" variant="outline" className="rounded-xl">
                العودة للرئيسية
              </Button>
            </div>
          </form>

          <section className="glass-card p-4">
            <h3 className="text-sm font-bold text-text">اختصارات سريعة</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button href="/student/sessions" type="button" variant="outline" size="sm" className="rounded-xl">
                <Icon name="book" size={16} />
                الجلسات
              </Button>
              <Button href="/student/ask" type="button" variant="outline" size="sm" className="rounded-xl">
                <Icon name="help" size={16} />
                اسأل مدرس
              </Button>
              <Button href="/student/study-rooms" type="button" variant="outline" size="sm" className="rounded-xl">
                <Icon name="school" size={16} />
                غرف المذاكرة
              </Button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
