"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import TeacherProfilePageView from "@/components/teacher/TeacherProfilePage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { dashboardApi, logApiError, teacherApi } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { notifyProfileUpdated } from "@/hooks/useSidebarProfile";
import {
  parseSubjects,
  subjectsToKeys,
  subjectsToText,
  TEACHER_GRADE_OPTIONS,
  validateBaseProfile
} from "@/lib/profile-form";
import { formatSubjectDisplay, resolveSubjectKey, SUBJECT_OPTIONS } from "@/lib/subjects";
import {
  patchTeacherProfileUrl,
  resolveTeacherProfileSection
} from "@/lib/teacher-profile";

const LEGACY_GRADE_MAP = {
  first: "sec_first",
  second: "sec_second",
  third: "sec_third"
};

function normalizeGrades(grades) {
  if (!Array.isArray(grades)) return [];
  const out = [];
  for (const raw of grades) {
    const mapped = LEGACY_GRADE_MAP[raw] || raw;
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

function profileToForm(user) {
  const tp = user?.teacher_profile;
  return {
    full_name: user?.full_name || "",
    phone: user?.phone || "",
    avatar_url: user?.avatar_url || "",
    bio: tp?.bio || "",
    subjects_text: subjectsToText(tp?.subjects),
    education: tp?.education || "",
    social_url: tp?.social_url || "",
    experience_years: tp?.experience_years != null ? String(tp.experience_years) : "",
    grades: normalizeGrades(tp?.grades)
  };
}

function TeacherProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const section = useMemo(() => resolveTeacherProfileSection(searchParams), [searchParams]);

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
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const syncUrl = useCallback(
    (patch) => {
      router.replace(patchTeacherProfileUrl(searchParams, patch), { scroll: false });
    },
    [router, searchParams]
  );

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
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
      setForm(profileToForm(user));

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
      if (!silent) {
        setProfile(null);
        setStats(null);
        setReviewsData(null);
      }
      setError(err.message || "تعذر تحميل الملف الشخصي");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const subjectsPreview = useMemo(
    () => parseSubjects(form.subjects_text).map((subject) => formatSubjectDisplay(subject)),
    [form.subjects_text]
  );

  const subjectQuickOptions = useMemo(
    () => SUBJECT_OPTIONS.map((s) => ({ value: s.key, label: s.label })),
    []
  );

  const onSectionChange = (next) => {
    syncUrl({ section: next || "all" });
  };

  const validateForm = () => {
    const errors = validateBaseProfile(form);
    if (form.bio.length > 1000) errors.bio = "النبذة طويلة جدًا (1000 حرف كحد أقصى)";
    const subjectKeys = subjectsToKeys(form.subjects_text);
    if (!subjectKeys.length && parseSubjects(form.subjects_text).length > 0) {
      errors.subjects_text = "اختر مواداً معروفة من القائمة أو استخدم الأزرار السريعة";
    }
    if (subjectKeys.length > 12) errors.subjects_text = "يمكنك إضافة 12 مادة كحد أقصى";
    const social = form.social_url.trim();
    if (social && !/^https?:\/\/.+/i.test(social)) {
      errors.social_url = "أدخل رابطًا يبدأ بـ http أو https";
    }
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

  const addSubject = (label, key) => {
    const trimmed = String(label || "").trim();
    if (!trimmed) return;
    setForm((prev) => {
      const incomingKey = resolveSubjectKey(key || trimmed);
      const currentKeys = subjectsToKeys(prev.subjects_text);
      if (incomingKey && currentKeys.includes(incomingKey)) return prev;

      const current = parseSubjects(prev.subjects_text);
      if (!incomingKey && current.some((subject) => subject.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }

      return { ...prev, subjects_text: [...current, trimmed].join("، ") };
    });
    setFieldErrors((prev) => ({ ...prev, subjects_text: "" }));
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
        subjects: subjectsToKeys(form.subjects_text),
        grades: form.grades,
        education: form.education.trim() || undefined,
        social_url: form.social_url.trim() || undefined,
        experience_years: form.experience_years ? Number(form.experience_years) : undefined
      });
      const saved = res?.data || null;
      setProfile(saved);
      setForm(profileToForm(saved));
      notifyProfileUpdated();
      toast.success(res?.message || "تم حفظ الملف الشخصي بنجاح");
    } catch (err) {
      toast.error(err.message || "تعذر حفظ الملف الشخصي");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm(profileToForm(profile));
    setFieldErrors({});
    toast.message("تم استرجاع آخر بيانات محفوظة");
  };

  const onPasswordSubmit = async () => {
    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("تأكيد كلمة المرور غير متطابق");
      return;
    }

    setPasswordSaving(true);
    try {
      const supabase = createClient();
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw pwError;
      toast.success("تم تحديث كلمة المرور بنجاح");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "تعذر تحديث كلمة المرور");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <TeacherProfilePageView
      profile={profile}
      form={form}
      fieldErrors={fieldErrors}
      stats={stats}
      reviewsData={reviewsData}
      subjectsPreview={subjectsPreview}
      gradeOptions={TEACHER_GRADE_OPTIONS}
      subjectQuickOptions={subjectQuickOptions}
      section={section}
      onSectionChange={onSectionChange}
      loading={loading}
      saving={saving}
      refreshing={refreshing}
      error={error}
      onRefresh={() => loadProfile({ silent: true })}
      onChange={handleChange}
      onToggleGrade={toggleGrade}
      onAddSubject={addSubject}
      onSubmit={onSubmit}
      onReset={resetForm}
      password={password}
      confirmPassword={confirmPassword}
      onPasswordChange={(e) => setPassword(e.target.value)}
      onConfirmPasswordChange={(e) => setConfirmPassword(e.target.value)}
      onPasswordSubmit={onPasswordSubmit}
      passwordSaving={passwordSaving}
    />
  );
}

export default function TeacherProfileRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <SectionLoader message="جاري تحميل الملف الشخصي..." />
        </div>
      }
    >
      <TeacherProfileContent />
    </Suspense>
  );
}
