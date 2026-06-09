"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { resolvePostAuthPathClient } from "@/lib/role-routes";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { cn } from "@/lib/utils";
import {
  authInputClass,
  authBtnGoogleClass,
  authBtnPrimaryClass,
  authDividerClass,
  authErrorClass
} from "@/components/auth/auth-styles";

export default function LoginForm({ redirectTo: redirectToProp = null, oauthError = false }) {
  const router = useRouter();
  const { signInWithGoogle, signInWithEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState(oauthError ? "تعذر تسجيل الدخول عبر Google. حاول مرة أخرى." : "");

  useEffect(() => {
    if (oauthError) {
      setError("تعذر تسجيل الدخول عبر Google. حاول مرة أخرى.");
    }
  }, [oauthError]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { error: oauthError } = await signInWithGoogle({ returnTo: redirectToProp });
      if (oauthError) {
        setError(getAuthErrorMessage(oauthError) || "تعذر تسجيل الدخول عبر Google");
        return;
      }
    } catch {
      setError("تعذر تسجيل الدخول عبر Google. حاول مرة أخرى.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading || googleLoading || redirecting) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("من فضلك أدخل البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: authError } = await signInWithEmail(normalizedEmail, password);
      if (authError) {
        setError(getAuthErrorMessage(authError) || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
        return;
      }

      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const safeRedirect = sanitizeRedirectPath(redirectToProp);
      const nextPath = safeRedirect || (await resolvePostAuthPathClient(session?.access_token));
      setRedirecting(true);
      router.replace(nextPath);
    } catch {
      setError("حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || googleLoading || redirecting;

  return (
    <>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={isBusy}
        className={authBtnGoogleClass}
      >
        <GoogleIcon />
        <span className="font-medium">{googleLoading ? "جاري التحويل..." : "المتابعة عبر Google"}</span>
      </button>

      <div className="relative my-5 flex items-center">
        <div className={authDividerClass} />
        <span className="mx-4 text-xs uppercase tracking-widest text-on-surface-variant">أو</span>
        <div className={authDividerClass} />
      </div>

      {error ? <div className={authErrorClass}>{error}</div> : null}

      <form method="post" action="/auth/login" onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-on-surface-variant" htmlFor="login-email">
            البريد الإلكتروني
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@peak-academy.net"
            required
            autoComplete="email"
            className={authInputClass}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-on-surface-variant" htmlFor="login-password">
              كلمة المرور
            </label>
            <Link href="/auth/forgot-password" className="text-xs text-md-primary hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className={cn(authInputClass, "ps-12 text-start")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              <span className="material-symbols-outlined text-lg">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        <button type="submit" disabled={isBusy} className={authBtnPrimaryClass}>
          {redirecting || loading ? (
            <span className="material-symbols-outlined animate-spin">sync</span>
          ) : (
            <>
              <span>{redirecting ? "جاري التحويل..." : loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}</span>
              <span className="material-symbols-outlined">login</span>
            </>
          )}
        </button>
      </form>
    </>
  );
}
