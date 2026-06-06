"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import StudentProfilePageView from "@/components/student/StudentProfilePage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { studentApi, logApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { notifyProfileUpdated } from "@/hooks/useSidebarProfile";
import {
  normalizeStudentGrade,
  STUDENT_GRADE_OPTIONS,
  validateBaseProfile
} from "@/lib/profile-form";
import {
  patchStudentProfileUrl,
  resolveStudentProfileSection
} from "@/lib/student-profile";

function profileToForm(data) {
  return {
    full_name: data?.full_name || "",
    phone: data?.phone || "",
    avatar_url: data?.avatar_url || "",
    grade: normalizeStudentGrade(data?.grade),
    section: data?.section || ""
  };
}

function StudentProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const section = useMemo(() => resolveStudentProfileSection(searchParams), [searchParams]);

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
    grade: "",
    section: ""
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await studentApi.profile();
      const data = res?.data || null;
      setProfile(data);
      setSubscriptionInfo(data?.subscription || null);
      setForm(profileToForm(data));
    } catch (err) {
      logApiError("student/profile", err);
      if (!silent) setProfile(null);
      setError(err.message || "تعذر تحميل الملف الشخصي");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onSectionChange = (next) => {
    router.replace(patchStudentProfileUrl(searchParams, { section: next }), { scroll: false });
  };

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
      const saved = res?.data;
      if (saved) {
        setProfile((prev) => (prev ? { ...prev, ...saved, stats: saved.stats || prev.stats } : prev));
        setForm(profileToForm(saved));
      }
      notifyProfileUpdated();
      toast.success(res?.message || "تم حفظ التغييرات");
    } catch (err) {
      toast.error(err.message || "تعذر حفظ الملف الشخصي");
      await loadProfile({ silent: true });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm(profileToForm(profile));
    setFieldErrors({});
    toast.message("تم استرجاع آخر بيانات محفوظة");
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
    <StudentProfilePageView
      profile={profile}
      form={form}
      fieldErrors={fieldErrors}
      stats={profile?.stats || {}}
      subscriptionInfo={subscriptionInfo}
      gradeOptions={STUDENT_GRADE_OPTIONS}
      section={section}
      onSectionChange={onSectionChange}
      loading={loading}
      saving={saving}
      refreshing={refreshing}
      error={error}
      onRefresh={() => loadProfile({ silent: true })}
      onChange={handleChange}
      onSubmit={onSubmit}
      onReset={resetForm}
      onCopyLinkCode={copyLinkCode}
      password={password}
      confirmPassword={confirmPassword}
      onPasswordChange={(e) => setPassword(e.target.value)}
      onConfirmPasswordChange={(e) => setConfirmPassword(e.target.value)}
      onPasswordSubmit={onPasswordSubmit}
      passwordSaving={passwordSaving}
    />
  );
}

export default function StudentProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <SectionLoader message="جاري تحميل الملف الشخصي..." />
        </div>
      }
    >
      <StudentProfileContent />
    </Suspense>
  );
}
