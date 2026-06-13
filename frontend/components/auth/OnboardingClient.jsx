"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Icon from "@/components/shared/Icon";
import AuthPageLayout from "@/components/auth/AuthPageLayout";
import AuthFormCard from "@/components/auth/AuthFormCard";
import AuthField, { authInputClass } from "@/components/auth/AuthField";
import { authBtnPrimaryClass, authErrorClass } from "@/components/auth/auth-styles";
import CsrfField from "@/components/auth/CsrfField";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { isProfileComplete, resolvePostAuthPathClient, ROLE_HOME } from "@/lib/role-routes";
import { profileFromAuthUser } from "@/lib/auth-user-profile";
import { ButtonLoader, LoadingSpinner } from "@/components/shared/LoadingSkeleton";
import { buildOnboardingLoginUrl } from "@/lib/auth-redirect";
import StudentAcademicFields from "@/components/auth/StudentAcademicFields";
import {
  defaultGradeForSchoolLevel,
  defaultGradeFromLevelParam,
  defaultSchoolLevelFromLevelParam,
  gradesForSchoolLevel
} from "@/lib/student-grade-form";
import {
  CURRENT_TERMS_VERSION,
  onboardingSchema,
  REGISTER_ROLES
} from "@/lib/onboarding-form";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function OnboardingClient({ deferredReturn = null, levelParam = null }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionEmail, setSessionEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      full_name: "",
      role: "student",
      school_level: defaultSchoolLevelFromLevelParam(levelParam),
      grade: defaultGradeFromLevelParam(levelParam),
      phone: "",
      acceptedTerms: false
    }
  });

  const selectedRole = useWatch({ control, name: "role" });
  const selectedSchoolLevel = useWatch({ control, name: "school_level" });
  const gradeOptions = gradesForSchoolLevel(selectedSchoolLevel);

  const handleSchoolLevelSelect = (level) => {
    setValue("grade", defaultGradeForSchoolLevel(level), { shouldValidate: true });
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace(buildOnboardingLoginUrl(deferredReturn));
        return;
      }

      const authUser = session.user;
      const hint = profileFromAuthUser(authUser);
      if (!cancelled) {
        setSessionEmail(authUser.email || "");
        if (hint?.full_name && hint.full_name !== "مستخدم") {
          reset({
            full_name: hint.full_name,
            role:
              hint?.role && ["student", "teacher", "parent"].includes(hint.role)
                ? hint.role
                : "student",
            school_level: defaultSchoolLevelFromLevelParam(levelParam),
            grade: defaultGradeFromLevelParam(levelParam),
            phone: hint.phone || ""
          });
        }
      }

      const path = await resolvePostAuthPathClient(session.access_token);
      if (!cancelled && path !== "/onboarding") {
        router.replace(deferredReturn || path);
        return;
      }

      if (!cancelled) setCheckingSession(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, deferredReturn, reset, levelParam]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace(buildOnboardingLoginUrl(deferredReturn));
    } finally {
      setSigningOut(false);
    }
  };

  const onSubmit = async (values) => {
    setLoading(true);
    setError("");

    try {
      const res = await authApi.setupProfile({
        full_name: values.full_name.trim(),
        role: values.role,
        grade: values.role === "student" ? values.grade : undefined,
        phone: values.phone?.trim() || undefined,
        accepted_terms: true,
        terms_version: CURRENT_TERMS_VERSION
      });

      const createdUser = res?.data;
      let nextPath = "/onboarding";

      if (createdUser && isProfileComplete(createdUser)) {
        nextPath = ROLE_HOME[createdUser.role] || "/onboarding";
      } else {
        const supabase = createClient();
        const {
          data: { session }
        } = await supabase.auth.getSession();
        nextPath = await resolvePostAuthPathClient(session?.access_token);
      }

      if (nextPath === "/onboarding") {
        if (res?.success && ROLE_HOME[values.role]) {
          nextPath = ROLE_HOME[values.role];
        } else {
          throw new Error("تعذر إكمال الملف الشخصي. حدّث الصفحة أو تواصل مع الدعم.");
        }
      }

      if (deferredReturn) {
        nextPath = deferredReturn;
      } else if (values.role === "teacher") {
        nextPath = "/teacher/profile/verification";
      }

      toast.success(res?.message || "تم إنشاء ملفك الشخصي بنجاح! مرحبًا بك في Peak Academy");
      router.replace(nextPath);
    } catch (err) {
      const message =
        err?.status === 403
          ? "لا تملك صلاحية إكمال الملف. سجّل الدخول بحساب آخر."
          : err?.status === 401 || err?.code === "AUTH_SESSION_MISSING"
            ? "انتهت جلسة الدخول. سجّل الخروج ثم سجّل الدخول مرة أخرى لإكمال ملفك."
            : err?.status === 429
              ? "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى."
              : err.message || "حدث خطأ غير متوقع";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <AuthPageLayout>
        <div className="flex flex-col items-center gap-4 py-12">
          <LoadingSpinner size="lg" glow label="جاري التحقق من جلسة الدخول" />
          <div className="text-center">
            <p className="text-sm font-medium text-on-surface">جاري التحقق من جلسة الدخول...</p>
            <p className="mt-1 text-xs text-on-surface-variant">لحظة واحدة فقط</p>
          </div>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout>
      <AuthFormCard
        className="max-w-[min(100%,34rem)]"
        title="أكمل ملفك الشخصي"
        subtitle="خطوتك الأولى نحو التفوق الأكاديمي — حدّد نوع حسابك وبياناتك الأساسية"
        footer={
          <div className="space-y-3 text-sm text-on-surface-variant">
            {sessionEmail ? (
              <p>
                مسجّل الدخول كـ{" "}
                <span dir="ltr" className="font-semibold text-md-primary">
                  {sessionEmail}
                </span>
              </p>
            ) : null}
            <p>
              ليس حسابك؟{" "}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="font-bold text-md-primary hover:underline disabled:opacity-60"
              >
                {signingOut ? "جاري الخروج..." : "تسجيل الدخول بحساب آخر"}
              </button>
            </p>
            <p className="text-xs">
              تحتاج مساعدة؟{" "}
              <Link href="mailto:support@peak-academy.net" className="font-bold text-md-primary hover:underline">
                تواصل مع الدعم
              </Link>
            </p>
          </div>
        }
      >
        {/* Progress indicator */}
        <div className="mb-6 flex justify-center gap-2" aria-hidden>
          <div className="h-1.5 w-10 rounded-full bg-primary-container" />
          <div className="h-1.5 w-2 rounded-full bg-surface-container-highest" />
          <div className="h-1.5 w-2 rounded-full bg-surface-container-highest" />
        </div>

        {deferredReturn ? (
          <div className="mb-5 rounded-lg border border-primary-container/30 bg-primary-container/10 px-3 py-2.5 text-center text-xs text-on-surface-variant">
            بعد إكمال ملفك ستُوجَّه تلقائيًا لإتمام خطوتك التالية على المنصة.
          </div>
        ) : null}

        <form method="post" action="/onboarding" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <CsrfField />
          <AuthField id="full_name" label="الاسم بالكامل" error={errors.full_name?.message}>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              placeholder="أدخل اسمك الثلاثي — مثال: أحمد محمد علي"
              className={authInputClass}
              {...register("full_name")}
            />
          </AuthField>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-on-surface-variant">نوع الحساب</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {REGISTER_ROLES.map((role) => {
                const selected = selectedRole === role.value;
                return (
                  <label
                    key={role.value}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 p-3 transition",
                      selected
                        ? "border-primary-container bg-primary-container/10 shadow-sm"
                        : "border-outline-variant bg-surface-container hover:border-primary-container/40"
                    )}
                  >
                    <input
                      type="radio"
                      value={role.value}
                      className="sr-only"
                      {...register("role")}
                    />
                    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container/15 text-md-primary">
                      <Icon name={role.icon} size={18} />
                    </span>
                    <span className="block text-sm font-bold text-on-surface">{role.label}</span>
                    <span className="mt-1 block text-[11px] leading-snug text-on-surface-variant">
                      {role.description}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.role ? (
              <p className="text-xs font-semibold text-error">{errors.role.message}</p>
            ) : null}
          </div>

          {selectedRole === "student" ? (
            <StudentAcademicFields
              control={control}
              errors={errors}
              schoolLevel={selectedSchoolLevel}
              gradeOptions={gradeOptions}
              onSchoolLevelSelect={handleSchoolLevelSelect}
            />
          ) : null}

          <AuthField
            id="phone"
            label="رقم الهاتف"
            hint="اختياري — لتسهيل التواصل معك"
            error={errors.phone?.message}
          >
            <div className="relative">
              <input
                id="phone"
                type="tel"
                dir="ltr"
                autoComplete="tel"
                placeholder="01xxxxxxxxx"
                className={cn(authInputClass, "pl-11 text-start")}
                {...register("phone")}
              />
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
                call
              </span>
            </div>
          </AuthField>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant bg-surface-container/50 p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-primary-container"
              {...register("acceptedTerms")}
            />
            <span className="text-xs leading-relaxed text-on-surface-variant">
              أوافق على{" "}
              <Link href="/terms" className="font-bold text-md-primary hover:underline" target="_blank">
                شروط الاستخدام
              </Link>{" "}
              و{" "}
              <Link href="/privacy" className="font-bold text-md-primary hover:underline" target="_blank">
                سياسة الخصوصية
              </Link>
            </span>
          </label>
          {errors.acceptedTerms ? (
            <p className="text-xs font-semibold text-error">{errors.acceptedTerms.message}</p>
          ) : null}

          {error ? <div className={authErrorClass}>{error}</div> : null}

          <button type="submit" disabled={loading} className={authBtnPrimaryClass}>
            {loading ? (
              <>
                <ButtonLoader />
                <span>جاري إنشاء الملف...</span>
              </>
            ) : (
              <>
                <span>حفظ والمتابعة</span>
                <span className="material-symbols-outlined transition-transform group-hover:-translate-x-0.5">
                  arrow_back
                </span>
              </>
            )}
          </button>
        </form>
      </AuthFormCard>
    </AuthPageLayout>
  );
}
