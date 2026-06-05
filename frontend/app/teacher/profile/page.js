"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatsCard from "@/components/admin/StatsCard";
import AvatarUpload from "@/components/profile/AvatarUpload";
import LoadingSkeleton, { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import PersonalInfoFields from "@/components/profile/PersonalInfoFields";
import ProfileErrorState from "@/components/profile/ProfileErrorState";
import ProfileHero from "@/components/profile/ProfileHero";
import { dashboardApi, logApiError, teacherApi } from "@/lib/api";
import { formatCurrencyEgp, formatDateAr } from "@/lib/format";
import {
  formatJoinDateAr,
  parseSubjects,
  subjectsToText,
  validateBaseProfile
} from "@/lib/profile-form";
import { cn } from "@/lib/utils";

const GRADE_OPTIONS = [
  { value: "first", label: "الأول الثانوي" },
  { value: "second", label: "الثاني الثانوي" },
  { value: "third", label: "الثالث الثانوي" }
];

function RatingStars({ value, count }) {
  return (
    <span className="inline-flex items-center gap-1 text-amber-400">
      <span>⭐</span>
      <span className="text-sm font-bold text-white">{Number(value || 0).toFixed(1)}</span>
      {count != null ? (
        <span className="text-xs text-white/70">({Number(count).toLocaleString("ar-EG")} تقييم)</span>
      ) : null}
    </span>
  );
}

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [reviewsData, setReviewsData] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
    bio: "",
    subjects_text: "",
    education: "",
    social_url: "",
    experience_years: "",
    grades: []
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const teacherProfile = profile?.teacher_profile;
  const commissionRate = Number(teacherProfile?.commission_rate || 70);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, dashboardRes, reviewsRes] = await Promise.all([
        dashboardApi.myProfile(),
        teacherApi.dashboard().catch((err) => {
          logApiError("teacher/profile/dashboard", err);
          return null;
        }),
        teacherApi.reviews(5).catch((err) => {
          logApiError("teacher/profile/reviews", err);
          return null;
        })
      ]);

      const user = profileRes?.data || null;
      setProfile(user);
      setReviewsData(reviewsRes?.data || null);
      setForm({
        full_name: user?.full_name || "",
        phone: user?.phone || "",
        avatar_url: user?.avatar_url || "",
        bio: user?.teacher_profile?.bio || "",
        subjects_text: subjectsToText(user?.teacher_profile?.subjects),
        education: user?.teacher_profile?.education || "",
        social_url: user?.teacher_profile?.social_url || "",
        experience_years:
          user?.teacher_profile?.experience_years != null
            ? String(user.teacher_profile.experience_years)
            : "",
        grades: Array.isArray(user?.teacher_profile?.grades) ? user.teacher_profile.grades : []
      });

      const dash = dashboardRes?.data;
      setStats({
        earnings: dash?.earnings_summary || null,
        sessions: {
          scheduled: dash?.stats?.scheduled_sessions ?? 0,
          live: dash?.stats?.live_sessions ?? 0,
          completed: dash?.stats?.completed_sessions ?? 0
        }
      });
    } catch (err) {
      logApiError("teacher/profile", err);
      setProfile(null);
      setStats(null);
      setReviewsData(null);
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
    const errors = validateBaseProfile({ ...form, avatar_url: form.avatar_url || "https://skip" });
    delete errors.avatar_url;
    if (form.bio.length > 1000) errors.bio = "النبذة طويلة جدًا (1000 حرف كحد أقصى)";
    if (subjectsPreview.length > 12) errors.subjects_text = "يمكنك إضافة 12 مادة كحد أقصى";
    return errors;
  };

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const toggleGrade = (grade) => {
    setForm((prev) => {
      const has = prev.grades.includes(grade);
      return {
        ...prev,
        grades: has ? prev.grades.filter((g) => g !== grade) : [...prev.grades, grade]
      };
    });
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
        subjects: subjectsPreview,
        grades: form.grades,
        education: form.education.trim() || undefined,
        social_url: form.social_url.trim() || undefined,
        experience_years: form.experience_years ? Number(form.experience_years) : undefined
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
      subjects_text: subjectsToText(teacherProfile?.subjects),
      education: teacherProfile?.education || "",
      social_url: teacherProfile?.social_url || "",
      experience_years:
        teacherProfile?.experience_years != null ? String(teacherProfile.experience_years) : "",
      grades: Array.isArray(teacherProfile?.grades) ? teacherProfile.grades : []
    });
    setFieldErrors({});
    toast.message("تم استرجاع آخر بيانات محفوظة");
  };

  const avgRating = reviewsData?.average_rating ?? teacherProfile?.rating;
  const reviewCount = reviewsData?.total_count ?? teacherProfile?.review_count ?? 0;

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
              <RatingStars value={avgRating} count={reviewCount} />
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
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div className="glass-card p-4">
            <LoadingSkeleton />
          </div>
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
                <AvatarUpload
                  name={form.full_name || profile.full_name}
                  avatarUrl={form.avatar_url || profile.avatar_url}
                  disabled={saving}
                  onUploaded={(url) => {
                    setForm((prev) => ({ ...prev, avatar_url: url }));
                    setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
                  }}
                />
                <PersonalInfoFields
                  form={form}
                  fieldErrors={fieldErrors}
                  email={profile.email}
                  onChange={handleChange}
                  disabled={saving}
                  showAvatarUrl={false}
                />
              </section>

              <section className="glass-card space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-black text-text">البيانات المهنية</h2>
                  <p className="mt-1 text-sm text-text-muted">عرّف نفسك للطلاب وحدد المواد التي تدرّسها.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>الصفوف التي تدرّسها</Label>
                    <div className="flex flex-wrap gap-2">
                      {GRADE_OPTIONS.map((grade) => (
                        <button
                          key={grade.value}
                          type="button"
                          disabled={saving}
                          onClick={() => toggleGrade(grade.value)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                            form.grades.includes(grade.value)
                              ? "bg-accent text-white"
                              : "border border-border bg-bg text-text-muted"
                          )}
                        >
                          {grade.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="experience_years">سنوات الخبرة</Label>
                      <Input
                        id="experience_years"
                        type="number"
                        min={0}
                        max={60}
                        value={form.experience_years}
                        onChange={handleChange("experience_years")}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="education">المؤهل العلمي</Label>
                      <Input
                        id="education"
                        value={form.education}
                        onChange={handleChange("education")}
                        placeholder="بكالوريوس علوم — جامعة القاهرة"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social_url">رابط يوتيوب / فيسبوك (اختياري)</Label>
                    <Input
                      id="social_url"
                      dir="ltr"
                      value={form.social_url}
                      onChange={handleChange("social_url")}
                      placeholder="https://"
                      disabled={saving}
                    />
                  </div>

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

              {reviewsData?.reviews?.length > 0 ? (
                <section className="glass-card space-y-3 p-5">
                  <h2 className="text-lg font-black text-text">آخر التقييمات</h2>
                  <ul className="space-y-3">
                    {reviewsData.reviews.map((review) => (
                      <li key={review.id} className="rounded-xl border border-border bg-bg/50 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-text">{review.student_name}</span>
                          <span className="text-amber-500">{"★".repeat(review.rating)}</span>
                        </div>
                        {review.comment ? (
                          <p className="mt-2 text-text-muted">{review.comment}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-text-muted">{formatDateAr(review.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

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
              <section className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
                <p className="text-sm text-text-muted">نسبة أرباحك من كل حصة</p>
                <p className="text-2xl font-bold text-orange-500">
                  {commissionRate.toLocaleString("ar-EG")}%
                </p>
                <p className="text-xs text-text-muted">
                  المنصة تأخذ {(100 - commissionRate).toLocaleString("ar-EG")}% كرسوم خدمة
                </p>
              </section>

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
