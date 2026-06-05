"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
        <p className="text-sm font-bold text-danger">{error}</p>
        <Link href="/auth/forgot-password" className="font-bold text-accent hover:underline">
          طلب رابط جديد
        </Link>
      </div>
    );
  }

  if (!ready) {
    return <SectionLoader message="جاري التحقق من الرابط..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-xl bg-danger/10 p-3 text-sm font-bold text-danger">⚠️ {error}</div>
      ) : null}
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-bold">
          كلمة المرور الجديدة
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          className="w-full rounded-xl border border-border p-3 font-cairo focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-bold">
          تأكيد كلمة المرور
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
          className="w-full rounded-xl border border-border p-3 font-cairo focus:border-accent focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-accent py-3 font-black text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
      </button>
    </form>
  );
}
