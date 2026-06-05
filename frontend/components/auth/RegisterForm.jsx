"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Icon from "@/components/shared/Icon";
import GoogleIcon from "@/components/auth/GoogleIcon";
import AuthField, { authInputClass } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { GRADE_OPTIONS } from "@/lib/profile-form";
import { isProfileComplete, resolvePostAuthPathClient, ROLE_HOME } from "@/lib/role-routes";
import { createClient } from "@/lib/supabase/client";
import {
  REGISTER_ROLES,
  registerStep1Schema,
  registerStep2Schema
} from "@/lib/register-form";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "بيانات الحساب" },
  { id: 2, title: "الملف الشخصي" }
];

export default function RegisterForm() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingEmailConfirm, setPendingEmailConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [accountData, setAccountData] = useState({ email: "", password: "", confirmPassword: "" });

  const step1Form = useForm({
    resolver: zodResolver(registerStep1Schema),
    defaultValues: accountData
  });

  const step2Form = useForm({
    resolver: zodResolver(registerStep2Schema),
    defaultValues: { full_name: "", role: "student", grade: "third", phone: "" }
  });

  const selectedRole = step2Form.watch("role");

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { error: oauthError } = await signInWithGoogle();
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
  });

  const finishRegistration = step2Form.handleSubmit(async (profileValues) => {
    setLoading(true);
    setError("");
    setPendingEmailConfirm(false);

    const email = accountData.email.trim().toLowerCase();
    const password = accountData.password;

    try {
      const { data, error: signUpError } = await signUpWithEmail(email, password);
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
        phone: profileValues.phone?.trim() || undefined
      });

      const createdUser = res?.data;
      let nextPath =
        createdUser && isProfileComplete(createdUser)
          ? ROLE_HOME[createdUser.role] || "/onboarding"
          : await resolvePostAuthPathClient(session?.access_token);

      if (nextPath === "/onboarding" && res?.success && ROLE_HOME[profileValues.role]) {
        nextPath = ROLE_HOME[profileValues.role];
      }

      router.replace(nextPath);
    } catch (err) {
      const needsOnboarding =
        err?.status === 403 || String(err?.message || "").includes("ملفك الشخصي");
      if (needsOnboarding) {
        router.replace("/onboarding");
        return;
      }
      setError(err.message || "تعذر إنشاء الحساب. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  });

  const isBusy = loading || googleLoading;

  if (pendingEmailConfirm) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
          <Icon name="check" size={28} />
        </div>
        <h2 className="text-xl font-black text-text">تحقق من بريدك الإلكتروني</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          أرسلنا رابط تأكيد إلى{" "}
          <span dir="ltr" className="font-semibold text-text">
            {accountData.email}
          </span>
          . بعد التأكيد سجّل الدخول لإكمال ملفك على المنصة.
        </p>
        <Button href="/auth/login" variant="accent" className="mt-2 w-full">
          الانتقال لتسجيل الدخول
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <nav aria-label="خطوات التسجيل" className="flex gap-2">
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <div
              key={s.id}
              className={cn(
                "flex flex-1 flex-col items-center rounded-xl border px-2 py-2 text-center transition",
                active && "border-accent bg-accent/5",
                done && "border-success/40 bg-success/5",
                !active && !done && "border-border bg-bg"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
                  active && "bg-accent text-white",
                  done && "bg-success text-white",
                  !active && !done && "bg-border text-text-muted"
                )}
              >
                {done ? "✓" : s.id}
              </span>
              <span className="mt-1 text-[11px] font-bold text-text">{s.title}</span>
            </div>
          );
        })}
      </nav>

      {error ? (
        <div className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-bold text-danger">⚠️ {error}</div>
      ) : null}

      {step === 1 ? (
        <>
          <p className="text-sm leading-relaxed text-text-muted">
            الخطوة 1 من 2: أنشئ بيانات الدخول، ثم اختر نوع حسابك (طالب، معلّم، أو وليّ أمر).
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={isBusy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-white px-4 py-3 font-bold text-text transition hover:border-accent disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading ? "جاري التحويل..." : "التسجيل عبر Google"}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-text-muted">أو بالبريد</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={goToStep2} className="space-y-4">
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

            <AuthField id="password" label="كلمة المرور" hint="6 أحرف على الأقل" error={step1Form.formState.errors.password?.message}>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  dir="ltr"
                  className={cn(authInputClass, "pl-16 text-start")}
                  {...step1Form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted hover:text-primary"
                >
                  {showPassword ? "إخفاء" : "إظهار"}
                </button>
              </div>
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
                  className={cn(authInputClass, "pl-16 text-start")}
                  {...step1Form.register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted hover:text-primary"
                >
                  {showConfirm ? "إخفاء" : "إظهار"}
                </button>
              </div>
            </AuthField>

            <Button type="submit" variant="accent" disabled={isBusy} className="h-12 w-full text-base font-black">
              التالي: نوع الحساب
              <Icon name="arrowRight" size={18} className="rotate-180" />
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-text-muted">
            الخطوة 2 من 2: حدّد دورك على المنصة وبياناتك الأساسية. بعد الحفظ نوجّهك للوحة المناسبة.
          </p>

          <form onSubmit={finishRegistration} className="space-y-4">
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

            <div className="space-y-2">
              <p className="text-sm font-bold text-text">نوع الحساب</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {REGISTER_ROLES.map((role) => {
                  const selected = selectedRole === role.value;
                  return (
                    <label
                      key={role.value}
                      className={cn(
                        "cursor-pointer rounded-xl border-2 p-3 transition",
                        selected ? "border-accent bg-accent/5 shadow-sm" : "border-border bg-white hover:border-accent/40"
                      )}
                    >
                      <input
                        type="radio"
                        value={role.value}
                        className="sr-only"
                        {...step2Form.register("role")}
                      />
                      <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 text-primary">
                        <Icon name={role.icon} size={18} />
                      </span>
                      <span className="block text-sm font-black text-text">{role.label}</span>
                      <span className="mt-1 block text-[11px] leading-snug text-text-muted">{role.description}</span>
                    </label>
                  );
                })}
              </div>
              {step2Form.formState.errors.role ? (
                <p className="text-xs font-semibold text-danger">{step2Form.formState.errors.role.message}</p>
              ) : null}
            </div>

            {selectedRole === "student" ? (
              <AuthField id="grade" label="الصف الدراسي" error={step2Form.formState.errors.grade?.message}>
                <select id="grade" className={authInputClass} {...step2Form.register("grade")}>
                  {GRADE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
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
              <Button type="submit" variant="accent" disabled={isBusy} className="h-12 flex-1 text-base font-black">
                {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب والمتابعة"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                className="h-12 flex-1"
                onClick={() => {
                  setError("");
                  step1Form.reset(accountData);
                  setStep(1);
                }}
              >
                رجوع
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
