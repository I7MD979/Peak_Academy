"use client";

import { useState } from "react";
import { toast } from "sonner";
import LandingReveal from "@/components/landing/LandingReveal";

export default function LandingPromoStrip({ promoCodes = {} }) {
  const [code, setCode] = useState("");
  const codesList = Object.keys(promoCodes);

  function applyPromo(event) {
    event.preventDefault();
    const key = code.trim().toUpperCase();
    if (!key) {
      toast.error("أدخل كود الخصم أولاً");
      return;
    }
    const message = promoCodes[key];
    if (message) {
      toast.success(message);
      setCode("");
      return;
    }
    toast.info("سجّل حسابك أولاً لتفعيل أكواد الخصم داخل المنصة");
  }

  if (!codesList.length) return null;

  return (
    <section className="landing-section-cream px-4 py-10 md:px-8" aria-label="أكواد الخصم">
      <LandingReveal>
        <div className="landing-card-light mx-auto max-w-3xl rounded-2xl border-dashed border-landing-orange/35 px-5 py-6 md:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-landing-orange/10 text-landing-orange">
                <span className="material-symbols-outlined text-xl">sell</span>
              </span>
              <div>
                <p className="font-bold text-landing-ink">جرّب كود خصم</p>
                <p className="mt-1 text-sm text-landing-ink-muted">
                  أكواد نشطة:{" "}
                  {codesList.map((promoCode, index) => (
                    <span key={promoCode}>
                      {index > 0 ? "، " : null}
                      <span dir="ltr" lang="en" className="font-semibold text-landing-orange">
                        {promoCode}
                      </span>
                    </span>
                  ))}
                </p>
              </div>
            </div>

            <form onSubmit={applyPromo} className="flex w-full gap-2 sm:max-w-sm">
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="أدخل الكود"
                dir="ltr"
                lang="en"
                maxLength={32}
                className="min-w-0 flex-1 rounded-xl border border-landing-ink/10 bg-white px-3 py-3 text-sm text-landing-ink placeholder:text-landing-ink-muted/60 focus:border-landing-orange/50 focus:outline-none focus:ring-2 focus:ring-landing-orange/15"
                aria-label="كود الخصم"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-landing-orange px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                تطبيق
              </button>
            </form>
          </div>
        </div>
      </LandingReveal>
    </section>
  );
}
