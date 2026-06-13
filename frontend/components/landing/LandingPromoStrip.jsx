"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LandingReveal from "@/components/landing/LandingReveal";
import { validatePublicPromoCode } from "@/lib/landing-api";

const PENDING_PROMO_KEY = "peak-pending-promo";

export default function LandingPromoStrip() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  async function applyPromo(event) {
    event.preventDefault();
    const key = code.trim().toUpperCase();
    if (!key) {
      toast.error("أدخل كود الخصم أولاً");
      return;
    }

    setChecking(true);
    try {
      const result = await validatePublicPromoCode(key, "subscription");
      if (!result.valid) {
        toast.error(result.message || "الكود غير صالح");
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(PENDING_PROMO_KEY, key);
      }

      toast.success(result.message || "تم التحقق من الكود — سجّل حسابك لتطبيقه");
      const redirect = encodeURIComponent(`/student/subscription?promo=${encodeURIComponent(key)}`);
      router.push(`/auth/register?redirect=${redirect}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="border-t border-landing-ink/[0.06] bg-[#f0f3f8] px-4 py-10 md:px-8" aria-label="كود الخصم">
      <LandingReveal>
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-landing-orange/20 bg-white shadow-[0_12px_40px_-16px_rgba(10,18,32,0.1)]">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 md:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-landing-orange/10 text-landing-orange">
                <span className="material-symbols-outlined text-xl">sell</span>
              </span>
              <div>
                <p className="font-bold text-landing-ink">لديك كود خصم؟</p>
                <p className="mt-1 text-sm text-landing-ink-muted">
                  أدخل الكود للتحقق منه — سيُطبَّق عند الاشتراك بعد تسجيل الدخول أو إنشاء حساب.
                </p>
              </div>
            </div>

            <form onSubmit={applyPromo} className="flex w-full gap-2 sm:max-w-sm">
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="أدخل الكود"
                dir="ltr"
                lang="en"
                maxLength={32}
                disabled={checking}
                className="min-w-0 flex-1 rounded-xl border border-landing-ink/10 bg-white px-3 py-3 text-sm text-landing-ink placeholder:text-landing-ink-muted/60 focus:border-landing-orange/50 focus:outline-none focus:ring-2 focus:ring-landing-orange/15 disabled:opacity-60"
                aria-label="كود الخصم"
              />
              <button
                type="submit"
                disabled={checking}
                className="shrink-0 rounded-xl bg-landing-orange px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {checking ? "جاري التحقق…" : "تطبيق"}
              </button>
            </form>
          </div>
        </div>
      </LandingReveal>
    </section>
  );
}
