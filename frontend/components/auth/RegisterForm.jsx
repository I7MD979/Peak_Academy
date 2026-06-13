"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import GoogleIcon from "@/components/auth/GoogleIcon";
import AuthField, { authInputClass } from "@/components/auth/AuthField";
import AuthStepIndicator from "@/components/auth/AuthStepIndicator";
import PasswordStrength from "@/components/auth/PasswordStrength";
import { Select } from "@/components/ui/Select";
import { ButtonLoader } from "@/components/shared/LoadingSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { GRADE_OPTIONS } from "@/lib/profile-form";
import { isProfileComplete, resolvePostAuthPathClient, ROLE_HOME } from "@/lib/role-routes";
import { createClient } from "@/lib/supabase/client";
import {
  CURRENT_TERMS_VERSION,
  defaultGradeFromLevelParam,
  registerStep1Schema,
  registerStep2Schema,
  ROLE_SELECT_OPTIONS
} from "@/lib/register-form";
import { buildPlanCheckoutPath } from "@/lib/checkout-redirect";
import {
  authBtnGoogleClass,
  authBtnPrimaryClass,
  authDividerClass,
  authErrorClass
} from "@/components/auth/auth-styles";
import CsrfField from "@/components/auth/CsrfField";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "بيانات الحساب" },
  { id: 2, title: "الملف الشخصي" }
];

export default function RegisterForm({ redirectTo = null, levelParam = null, notice = null }) {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingEmailConfirm, setPendingEmailConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [accountData, setAccountData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false
  });

  const step1Form = useForm({
    resolver: zodResolver(registerStep1Schema),
    defaultValues: accountData
  });

  const passwordValue = useWatch({ control: step1Form.control, name: "password" });

  const step2Form = useForm({
    resolver: zodResolver(registerStep2Schema),
    defaultValues: {
      full_name: "",
      role: "student",
      grade: defaultGradeFromLevelParam(levelParam),
      phone: ""
    }
  });

  const selectedRole = useWatch({ control: step2Form.control, name: "role" });

  const resolveNextPath = async (sessionToken, createdUser, role) => {
    let nextPath = redirectTo;
    if (!nextPath) {
      nextPath =
        createdUser && isProfileComplete(createdUser)
          ? ROLE_HOME[createdUser.role] || "/onboarding"
          : await resolvePostAuthPathClient(sessionToken);

      if (nextPath === "/onboarding" && role && ROLE_HOME[role]) {
        nextPath = ROLE_HOME[role];
      }
    }
    return nextPath;
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { error: oauthError } = await signInWithGoogle({ returnTo: redirectTo, intent: "register" });
      if (oauthError) {
        setError(getAuthErrorMessage(oauthError) || "تعذر المتابعة عبر Google");
      }
    } catch {
      setError("تعذر المتابعة عبر Google. حاول مرة أخرى.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const goToStep2 = step1Form.handleSubmit((values) => {
    setAccountData(values);
    setError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const finishRegistration = step2Form.handleSubmit(async (profileValues) => {
    setLoading(true);
    setError("");
    setPendingEmailConfirm(false);

    const email = accountData.email.trim().toLowerCase();
    const password = accountData.password;

    try {
      const { error: signUpError } = await signUpWithEmail(email, password);
      if (signUpError) {
        setError(getAuthErrorMessage(signUpError));
        setStep(1);
        return;
      }

      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setPendingEmailConfirm(true);
        return;
      }

      const res = await authApi.setupProfile({
        full_name: profileValues.full_name.trim(),
        role: profileValues.role,
        grade: profileValues.role === "student" ? profileValues.grade : undefined,
        phone: profileValues.phone?.trim() || undefined,
        accepted_terms: true,
        terms_version: CURRENT_TERMS_VERSION
      });

      const nextPath = await resolveNextPath(session.access_token, res?.data, profileValues.role);
      router.replace(nextPath);
    } catch (err) {
      const needsOnboarding =
        err?.status === 403 ||
        err?.status === 400 ||
        String(err?.message || "").includes("ملفك الشخصي");
      if (needsOnboarding) {
        const onboardingPath = redirectTo
          ? `/onboarding?next=${encodeURIComponent(redirectTo)}`
          : "/onboarding";
        router.replace(onboardingPath);
        return;
      }
      setError(err.message || "تعذر إنشاء الحساب. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  });

  const isBusy = loading || googleLoading;

  const loginHref = redirectTo
    ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}`
    : "/auth/login";

  if (pendingEmailConfirm) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
          <span className="material-symbols-outlined text-3xl">mark_email_read</span>
        </div>
        <h2 className="text-xl font-bold text-on-surface">تحقق من بريدك الإلكتروني</h2>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          أرسلنا رابط تأكيد إلى{" "}
          <span dir="ltr" className="font-semibold text-md-primary">
            {accountData.email}
          </span>
          . بعد التأكيد سجّل الدخول لإكمال ملفك على المنصة.
        </p>
        <Link href={loginHref} className={cn(authBtnPrimaryClass, "inline-flex no-underline")}>
          الانتقال لتسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AuthStepIndicator steps={STEPS} currentStep={step} />

      {notice === "no_account" ? (
        <div className="rounded-lg border border-md-primary/30 bg-md-primary/10 p-3 text-center text-sm text-on-surface">
          لا يوجد حساب مسجّل بهذا البريد الإلكتروني. يرجى إنشاء حساب جديد للمتابعة.
        </div>
      ) : null}

      {error ? <div className={authErrorClass}>{error}</div> : null}

      {step === 1 ? (
        <>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            الخطوة 1 من 2: أنشئ بيانات الدخول. كلمة المرور 8 أحرف على الأقل.
          </p>

          <button type="button" onClick={handleGoogle} disabled={isBusy} className={authBtnGoogleClass}>
            <GoogleIcon />
            <span>{googleLoading ? "جاري التحويل..." : "التسجيل عبر Google"}</span>
          </button>

          <div className="relative my-2 flex items-center">
            <div className={authDividerClass} />
            <span className="mx-4 text-xs uppercase tracking-widest text-on-surface-variant">أو</span>
            <div className={authDividerClass} />
          </div>

          <form method="post" action="/auth/register" onSubmit={goToStep2} className="space-y-4">
            <CsrfField />
            <AuthField id="email" label="البريد الإلكتروني" error={step1Form.formState.errors.email?.message}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                dir="ltr"
                className={cn(authInputClass, "text-start")}
                {...step1Form.register("email")}
              />
            </AuthField>

            <AuthField
              id="password"
              label="كلمة المرور"
              hint="8 أحرف على الأقل"
              error={step1Form.formState.errors.password?.message}
            >
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  dir="ltr"
                  className={cn(authInputClass, "ps-12 text-start")}
                  {...step1Form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              <PasswordStrength password={passwordValue} className="mt-2" />
            </AuthField>

            <AuthField
              id="confirmPassword"
              label="تأكيد كلمة المرور"
              error={step1Form.formState.errors.confirmPassword?.message}
            >
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  dir="ltr"
                  className={cn(authInputClass, "ps-12 text-start")}
                  {...step1Form.register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-label={showConfirm ? "إخفاء التأكيد" : "إظهار التأكيد"}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showConfirm ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </AuthField>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant bg-surface-container/50 p-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-primary-container"
                {...step1Form.register("acceptedTerms")}
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
            {step1Form.formState.errors.acceptedTerms ? (
              <p className="text-xs font-semibold text-error">
                {step1Form.formState.errors.acceptedTerms.message}
              </p>
            ) : null}

            <button type="submit" disabled={isBusy} className={authBtnPrimaryClass}>
              <span>التالي: نوع الحساب</span>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            الخطوة 2 من 2: حدّد دورك وبياناتك. بعد الحفظ نوجّهك مباشرة للوحة المناسبة
            {redirectTo ? " أو لإتمام الاشتراك." : "."}
          </p>

          <form method="post" action="/auth/register" onSubmit={finishRegistration} className="space-y-4">
            <CsrfField />
            <AuthField id="full_name" label="الاسم بالكامل" error={step2Form.formState.errors.full_name?.message}>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                placeholder="مثال: أحمد محمد"
                className={authInputClass}
                {...step2Form.register("full_name")}
              />
            </AuthField>

            <AuthField id="role" label="نوع الحساب" error={step2Form.formState.errors.role?.message}>
              <Controller
                name="role"
                control={step2Form.control}
                render={({ field }) => (
                  <Select
                    id="role"
                    variant="dark"
                    placeholder="اختر نوع الحساب"
                    options={ROLE_SELECT_OPTIONS}
                    showError={false}
                    {...field}
                  />
                )}
              />
            </AuthField>

            {selectedRole === "student" ? (
              <AuthField id="grade" label="الصف الدراسي" error={step2Form.formState.errors.grade?.message}>
                <Controller
                  name="grade"
                  control={step2Form.control}
                  render={({ field }) => (
                    <Select
                      id="grade"
                      variant="dark"
                      placeholder="اختر الصف"
                      options={GRADE_OPTIONS}
                      showError={false}
                      {...field}
                    />
                  )}
                />
              </AuthField>
            ) : null}

            <AuthField
              id="phone"
              label="رقم الهاتف"
              hint="اختياري"
              error={step2Form.formState.errors.phone?.message}
            >
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className={cn(authInputClass, "text-start")}
                {...step2Form.register("phone")}
              />
            </AuthField>

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button type="submit" disabled={isBusy} className={cn(authBtnPrimaryClass, "flex-1")}>
                {loading ? (
                  <>
                    <ButtonLoader />
                    <span>جاري إنشاء الحساب...</span>
                  </>
                ) : (
                  <>
                    <span>إنشاء الحساب والمتابعة</span>
                    <span className="material-symbols-outlined">arrow_back</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isBusy}
                className="flex h-12 flex-1 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-sm font-semibold text-on-surface transition hover:bg-surface-container-high disabled:opacity-60 sm:min-h-[3rem]"
                onClick={() => {
                  setError("");
                  step1Form.reset(accountData);
                  setStep(1);
                }}
              >
                رجوع
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
