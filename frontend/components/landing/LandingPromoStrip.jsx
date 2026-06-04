"use client";

import { useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/shared/Icon";
import LandingReveal from "@/components/landing/LandingReveal";
import { demoPromoCodes } from "@/lib/landing-content";

export default function LandingPromoStrip() {
  const [code, setCode] = useState("");

  function applyPromo(e) {
    e.preventDefault();
    const key = code.trim().toUpperCase();
    if (!key) {
      toast.error("أدخل كود الخصم أولاً");
      return;
    }
    const message = demoPromoCodes[key];
    if (message) {
      toast.success(message);
      setCode("");
    } else {
      toast.info("سجّل حسابك أولاً لتفعيل أكواد الخصم داخل المنصة");
    }
  }

  return (
    <section className="bg-slate-50 px-4 pb-4 md:px-8" aria-label="تجربة أكواد الخصم">
      <LandingReveal>
        <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-accent/40 bg-white px-4 py-5 shadow-sm md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon name="tag" size={20} />
              </span>
              <div>
                <p className="font-bold text-primary">جرّب كود خصم</p>
                <p className="mt-0.5 text-sm text-text-muted">
                  أكواد تجريبية:{" "}
                  <span dir="ltr" lang="en" className="font-semibold text-accent">
                    PEAK20
                  </span>
                  ،{" "}
                  <span dir="ltr" lang="en" className="font-semibold text-accent">
                    WELCOME
                  </span>
                  ،{" "}
                  <span dir="ltr" lang="en" className="font-semibold text-accent">
                    EARLYBIRD
                  </span>
                </p>
              </div>
            </div>
            <form onSubmit={applyPromo} className="flex w-full gap-2 sm:max-w-xs">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="أدخل الكود"
                dir="ltr"
                lang="en"
                className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                aria-label="كود الخصم"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500"
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
