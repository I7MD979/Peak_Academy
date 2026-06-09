"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { authInputClass, authBtnPrimaryClass, authErrorClass } from "@/components/auth/auth-styles";
import CsrfField from "@/components/auth/CsrfField";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("أدخل بريدك الإلكتروني.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      if (resetError) {
        setError(getAuthErrorMessage(resetError) || "تعذر إرسال رابط إعادة التعيين.");
        return;
      }
      setSent(true);
    } catch {
      setError("حدث خطأ. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15">
          <span className="material-symbols-outlined text-3xl text-success">mark_email_read</span>
        </div>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          إذا كان البريد مسجّلًا لدينا، ستصلك رسالة برابط إعادة تعيين كلمة المرور.
        </p>
        <Link href="/auth/login" className="font-bold text-md-primary hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <form method="post" action="/auth/forgot-password" onSubmit={handleSubmit} className="space-y-5">
      <CsrfField />
      {error ? <div className={authErrorClass}>{error}</div> : null}

      <div className="space-y-2">
        <label htmlFor="forgot-email" className="block text-xs font-semibold text-on-surface-variant">
          البريد الإلكتروني
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="example@peakacademy.com"
          dir="ltr"
          className={authInputClass}
        />
      </div>

      <button type="submit" disabled={loading} className={authBtnPrimaryClass}>
        {loading ? (
          <>
            <span className="material-symbols-outlined animate-spin">sync</span>
            <span>جاري الإرسال...</span>
          </>
        ) : (
          <>
            <span>إرسال رابط إعادة التعيين</span>
            <span className="material-symbols-outlined">send</span>
          </>
        )}
      </button>
    </form>
  );
}
