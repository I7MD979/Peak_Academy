"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { resolvePostAuthPathClient } from "@/lib/role-routes";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";
import GoogleIcon from "@/components/auth/GoogleIcon";

export default function LoginForm({ redirectTo: redirectToProp = null }) {
  const router = useRouter();
  const { signInWithGoogle, signInWithEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { error: oauthError } = await signInWithGoogle();
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
      const nextPath =
        safeRedirect || (await resolvePostAuthPathClient(session?.access_token));
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
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={isBusy}
        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-white px-4 py-3 font-bold text-text transition-colors hover:border-accent disabled:opacity-50"
      >
        <GoogleIcon />
        {googleLoading ? "جاري التحويل..." : "المتابعة عبر Google"}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm text-text-muted">أو</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleLogin} className="space-y-3">
        {error ? (
          <div className="rounded-xl bg-danger/10 p-3 text-sm font-bold text-danger">⚠️ {error}</div>
        ) : null}

        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-bold">
            البريد الإلكتروني
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-border p-3 font-cairo transition-colors focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-1 flex justify-between">
            <label htmlFor="login-password" className="text-sm font-bold">
              كلمة المرور
            </label>
            <a href="/auth/forgot-password" className="text-xs font-bold text-accent hover:underline">
              نسيت كلمة المرور؟
            </a>
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
              className="w-full rounded-xl border border-border p-3 pl-16 font-cairo transition-colors focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted hover:text-primary"
            >
              {showPassword ? "إخفاء" : "إظهار"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isBusy}
          className="w-full rounded-xl bg-accent py-3 font-black text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {redirecting ? "جاري التحويل..." : loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
