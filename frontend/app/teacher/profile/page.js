"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatsCard from "@/components/admin/StatsCard";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import PersonalInfoFields from "@/components/profile/PersonalInfoFields";
import ProfileErrorState from "@/components/profile/ProfileErrorState";
import ProfileHero from "@/components/profile/ProfileHero";
import { dashboardApi, sessionsApi } from "@/lib/api";
import { formatCurrencyEgp } from "@/lib/format";
import {
  formatJoinDateAr,
  parseSubjects,
  subjectsToText,
  validateBaseProfile
} from "@/lib/profile-form";
import { cn } from "@/lib/utils";

function RatingStars({ value }) {
  const rating = Math.round(Number(value) || 0);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? "opacity-100" : "opacity-30"}>
          ★
        </span>
      ))}
      <span className="mr-1 text-sm font-bold text-white">{Number(value || 0).toFixed(1)}</span>
    </span>
  );
}

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
    bio: "",
    subjects_text: ""
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const teacherProfile = profile?.teacher_profile;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, summaryRes, scheduledRes, liveRes, completedRes] = await Promise.all([
        dashboardApi.myProfile(),
        dashboardApi.teacherEarningsSummary().catch(() => null),
        sessionsApi.list("status=scheduled&limit=1").catch(() => null),
        sessionsApi.list("status=live&limit=1").catch(() => null),
        sessionsApi.list("status=completed&limit=1").catch(() => null)
      ]);

      const user = profileRes?.data || null;
      setProfile(user);
      setForm({
        full_name: user?.full_name || "",
        phone: user?.phone || "",
        avatar_url: user?.avatar_url || "",
        bio: user?.teacher_profile?.bio || "",
        subjects_text: subjectsToText(user?.teacher_profile?.subjects)
      });

      setStats({
        earnings: summaryRes?.data || null,
        sessions: {
          scheduled: scheduledRes?.pagination?.total ?? 0,
          live: liveRes?.pagination?.total ?? 0,
          completed: completedRes?.pagination?.total ?? 0
        }
      });
    } catch (err) {
      setProfile(null);
      setStats(null);
      setError(err.message || "تعذر تحميل الملف الشخصي");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const subjectsPreview = useMemo(() => parseSubjects(form.subjects_text), [form.subjects_text]);

  const validateForm = () => {
    const errors = validateBaseProfile(form);
    if (form.bio.length > 1000) errors.bio = "النبذة طويلة جدًا (1000 حرف كحد أقصى)";
    if (subjectsPreview.length > 12) errors.subjects_text = "يمكنك إضافة 12 مادة كحد أقصى";
    return errors;
  };

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
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
      const res = await dashboardApi.updateMyProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        avatar_url: form.avatar_url.trim() || undefined,
        bio: form.bio.trim(),
        subjects: subjectsPreview
      });
      setProfile(res?.data || null);
      toast.success(res?.message || "تم حفظ الملف الشخصي بنجاح");
      await loadProfile();
    } catch (err) {
      toast.error(err.message || "تعذر حفظ الملف الشخصي");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      avatar_url: profile?.avatar_url || "",
      bio: teacherProfile?.bio || "",
      subjects_text: subjectsToText(teacherProfile?.subjects)
    });
    setFieldErrors({});
    toast.message("تم استرجاع آخر بيانات محفوظة");
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <ProfileHero
        eyebrow="ملفي الشخصي"
        title={profile?.full_name || "معلم Peak Academy"}
        subtitle={profile?.email || "—"}
        name={form.full_name || profile?.full_name}
        avatarUrl={form.avatar_url || profile?.avatar_url}
        onRefresh={loadProfile}
        refreshing={loading || saving}
        actions={
          profile ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
              <RatingStars value={teacherProfile?.rating} />
              {teacherProfile?.id_verified ? (
                <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success">
                  موثّق
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                  قيد التوثيق
                </span>
              )}
            </div>
          ) : null
        }
      />

      {error ? <ProfileErrorState message={error} onRetry={loadProfile} /> : null}

      {loading ? (
        <div className="glass-card p-4">
          <LoadingSkeleton />
        </div>
      ) : null}

      {!loading && profile ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="جلسات مجدولة"
              value={(stats?.sessions?.scheduled ?? 0).toLocaleString("ar-EG")}
              iconName="calendarDays"
              tone="blue"
            />
            <StatsCard
              title="جلسات مباشرة"
              value={(stats?.sessions?.live ?? 0).toLocaleString("ar-EG")}
              iconName="live"
              tone="accent"
            />
            <StatsCard
              title="جلسات مكتملة"
              value={(stats?.sessions?.completed ?? 0).toLocaleString("ar-EG")}
              iconName="check"
              tone="success"
            />
            <StatsCard
              title="إجمالي الأرباح"
              value={formatCurrencyEgp(stats?.earnings?.total_earnings)}
              iconName="wallet"
              tone="warning"
              hint={`متاح للسحب: ${formatCurrencyEgp(stats?.earnings?.available_balance)}`}
            />
          </section>

          <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <section className="glass-card space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-black text-text">البيانات الأساسية</h2>
                  <p className="mt-1 text-sm text-text-muted">معلومات التواصل والهوية الظاهرة للطلاب.</p>
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
                  <h2 className="text-lg font-black text-text">البيانات المهنية</h2>
                  <p className="mt-1 text-sm text-text-muted">عرّف نفسك للطلاب وحدد المواد التي تدرّسها.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subjects_text">المواد التي تدرّسها</Label>
                    <Input
                      id="subjects_text"
                      value={form.subjects_text}
                      onChange={handleChange("subjects_text")}
                      placeholder="كيمياء، فيزياء، رياضيات"
                      disabled={saving}
                      className={cn(fieldErrors.subjects_text && "border-destructive")}
                    />
                    {fieldErrors.subjects_text ? (
                      <p className="text-xs text-destructive">{fieldErrors.subjects_text}</p>
                    ) : (
                      <p className="text-xs text-text-muted">افصل بين المواد بفاصلة عربية أو إنجليزية</p>
                    )}
                    {subjectsPreview.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {subjectsPreview.map((subject) => (
                          <span
                            key={subject}
                            className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">نبذة مهنية</Label>
                    <textarea
                      id="bio"
                      rows={5}
                      value={form.bio}
                      onChange={handleChange("bio")}
                      maxLength={1000}
                      disabled={saving}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="اكتب خبرتك، أسلوبك في الشرح، وما يميزك كمدرس..."
                    />
                    <p className="text-xs text-text-muted">{form.bio.length}/1000</p>
                    {fieldErrors.bio ? (
                      <p className="text-xs text-destructive">{fieldErrors.bio}</p>
                    ) : null}
                  </div>
                </div>
              </section>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="accent" className="rounded-xl" disabled={saving}>
                  {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" disabled={saving} onClick={resetForm}>
                  تراجع
                </Button>
                <Button href="/teacher/earnings" type="button" variant="outline" className="rounded-xl">
                  <Icon name="wallet" size={16} />
                  الأرباح
                </Button>
              </div>
            </div>

            <aside className="space-y-4">
              <section className="glass-card p-5">
                <h3 className="text-lg font-black text-text">ملخص الحساب</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-muted">الدور</dt>
                    <dd className="font-bold">مدرس</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-muted">حالة الحساب</dt>
                    <dd className={cn("font-bold", profile.is_active ? "text-success" : "text-destructive")}>
                      {profile.is_active ? "نشط" : "موقوف"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-muted">نسبة العمولة</dt>
                    <dd className="font-bold">
                      {Number(teacherProfile?.commission_rate || 70).toLocaleString("ar-EG")}%
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-muted">عدد المواد</dt>
                    <dd className="font-bold">{subjectsPreview.length.toLocaleString("ar-EG")}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-muted">تاريخ الانضمام</dt>
                    <dd className="font-bold">{formatJoinDateAr(profile.created_at)}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-dashed border-border bg-bg/80 p-4 text-sm text-text-muted">
                <p className="font-bold text-text">نصيحة</p>
                <p className="mt-2 leading-relaxed">
                  أكمل نبذتك المهنية وحدد موادك بدقة لزيادة ثقة الطلاب ومعدل التسجيل في جلساتك.
                </p>
              </section>
            </aside>
          </form>
        </>
      ) : null}
    </div>
  );
}
