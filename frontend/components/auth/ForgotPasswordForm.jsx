"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

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
        <p className="text-sm leading-relaxed text-text-muted">
          إذا كان البريد مسجّلًا لدينا، ستصلك رسالة برابط إعادة تعيين كلمة المرور.
        </p>
        <Link href="/auth/login" className="font-bold text-accent hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-xl bg-danger/10 p-3 text-sm font-bold text-danger">⚠️ {error}</div>
      ) : null}
      <div>
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-bold">
          البريد الإلكتروني
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-xl border border-border p-3 font-cairo focus:border-accent focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-accent py-3 font-black text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
      </button>
      <p className="text-center text-sm text-text-muted">
        <Link href="/auth/login" className="font-bold text-accent hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
