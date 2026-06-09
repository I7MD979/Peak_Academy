"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { getAuthErrorMessage } from "@/lib/auth-errors";

import {
  authInputClass,
  authBtnPrimaryClass,
  authErrorClass
} from "@/components/auth/auth-styles";
import CsrfField from "@/components/auth/CsrfField";
import { cn } from "@/lib/utils";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initSession() {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (exchangeError) {
          setError(getAuthErrorMessage(exchangeError) || "رابط غير صالح أو منتهٍ.");
          return;
        }
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!active) return;
      if (session) {
        setReady(true);
      } else {
        setError("رابط إعادة التعيين غير صالح. اطلب رابطًا جديدًا.");
      }
    }

    initSession();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(getAuthErrorMessage(updateError) || "تعذر تحديث كلمة المرور.");
        return;
      }
      router.replace("/auth/login");
    } catch {
      setError("حدث خطأ. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  if (error && !ready) {
    return (
      <div className="space-y-4 text-center">
        <div className={authErrorClass}>{error}</div>
        <Link href="/auth/forgot-password" className="font-bold text-md-primary hover:underline">
          طلب رابط جديد
        </Link>
      </div>
    );
  }

  if (!ready) {
    return <SectionLoader message="جاري التحقق من الرابط..." />;
  }

  return (
    <form method="post" action="/auth/reset-password" onSubmit={handleSubmit} className="space-y-6">
      <CsrfField />
      {error ? <div className={authErrorClass}>{error}</div> : null}

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-on-surface-variant" htmlFor="new-password">
          كلمة المرور الجديدة
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
            autoComplete="new-password"
            className={cn(authInputClass, "pl-12 text-start")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            <span className="material-symbols-outlined text-lg">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-on-surface-variant" htmlFor="confirm-password">
          تأكيد كلمة المرور
        </label>
        <div className="relative">
          <input
            id="confirm-password"
            type={showConfirm ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
            autoComplete="new-password"
            className={cn(authInputClass, "pl-12 text-start")}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((prev) => !prev)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
            aria-label={showConfirm ? "إخفاء التأكيد" : "إظهار التأكيد"}
          >
            <span className="material-symbols-outlined text-lg">
              {showConfirm ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading} className={authBtnPrimaryClass}>
        {loading ? (
          <span className="material-symbols-outlined animate-spin">sync</span>
        ) : (
          <>
            <span>حفظ كلمة المرور</span>
            <span className="material-symbols-outlined">lock_reset</span>
          </>
        )}
      </button>
    </form>
  );
}
