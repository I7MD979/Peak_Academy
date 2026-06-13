"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { registerHrefForLevel } from "@/lib/level-params";
import { resolveHeroCounters } from "@/lib/landing-api";
import { cn } from "@/lib/utils";

const LEVEL_OPTIONS = [
  { value: "prep", label: "طالب إعدادي" },
  { value: "sec", label: "طالب ثانوي" }
];

function useCountUp(target, isDecimal = false, active = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    let current = 0;
    const steps = 2500 / 16;
    const increment = target / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setValue(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [target, isDecimal, active]);

  return value;
}

export default function LandingHero({ platformStats }) {
  const [activeTab, setActiveTab] = useState("prep");
  const [statsActive, setStatsActive] = useState(false);
  const statsRef = useRef(null);

  const counters = useMemo(() => resolveHeroCounters(platformStats), [platformStats]);
  const sessions = useCountUp(counters.sessions, false, statsActive);
  const teachers = useCountUp(counters.teachers, false, statsActive);
  const rating = useCountUp(counters.rating, true, statsActive);

  const registerHref = registerHrefForLevel(activeTab);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsActive(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="landing-hero relative flex min-h-[100dvh] min-h-screen items-center overflow-hidden bg-landing-navy pb-10 pt-24 text-white sm:pb-14 sm:pt-28 md:pb-16">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute inset-0 animate-float">
          <Image
            src="/landing/hero-mountain.png"
            alt=""
            fill
            priority
            className="object-cover object-bottom opacity-55"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-l from-landing-navy via-landing-navy/72 to-landing-navy/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-landing-navy via-landing-navy/45 to-transparent" />
        <div className="landing-hero-glow absolute inset-0 opacity-80" />
      </div>

      <div className="landing-container relative z-10 flex justify-center">
        <div className="landing-hero-enter mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <h1 className="mb-6 font-black sm:mb-8">
            <span className="landing-hero-display block text-white">مش بس حصص</span>
            <span className="landing-hero-accent flex flex-wrap items-center justify-center gap-2 text-landing-orange sm:gap-4">
              ده مستقبلك <span className="animate-pulse" aria-hidden="true">↗</span>
            </span>
            <span className="landing-hero-tagline mt-2 block font-bold text-landing-on-dark-muted sm:mt-4">وصل للقمة</span>
          </h1>

          <p className="mb-8 max-w-xl text-sm leading-relaxed text-landing-on-dark-muted sm:mb-10 sm:text-base md:text-lg">
            تجربة تعليمية تفاعلية حديثة للمرحلة الإعدادية والثانوية. معلّمون متميزون ومتابعة شخصية تساعدك على
            التفوق والوصول إلى القمة.
          </p>

          <div className="relative z-20 mb-6 w-full max-w-md sm:mb-10">
            <p className="mb-3 text-xs font-semibold text-landing-on-dark-subtle">اختر مرحلتك الدراسية</p>
            <div
              role="tablist"
              aria-label="المرحلة الدراسية"
              className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm"
            >
              {LEVEL_OPTIONS.map((option) => {
                const active = activeTab === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(option.value)}
                    className={cn(
                      "rounded-xl px-2 py-3 text-xs font-bold transition-all sm:px-6 sm:py-3 sm:text-sm md:px-8 md:py-3.5",
                      active
                        ? "bg-landing-orange text-white shadow-[0_4px_20px_rgba(245,114,26,0.2)]"
                        : "text-landing-on-dark-muted hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mb-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:mb-14 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
            <Link href={registerHref} className="landing-btn-primary w-full sm:w-auto">
              <span>ابدأ رحلتك</span>
              <span>→</span>
            </Link>
            <a href="#levels" className="landing-btn-outline w-full sm:w-auto">
              استكشف المناهج
            </a>
          </div>

          <div
            ref={statsRef}
            className="grid w-full max-w-2xl grid-cols-1 gap-4 rounded-2xl border border-white/[0.12] bg-landing-navy/50 p-4 pt-6 text-center backdrop-blur-md min-[420px]:grid-cols-3 min-[420px]:gap-3 sm:flex sm:flex-wrap sm:justify-center sm:gap-10 sm:p-5 sm:pt-8 md:gap-16"
          >
            <div className="min-w-0">
              <div className="mb-0.5 text-2xl font-black text-white sm:mb-1 sm:text-3xl">
                +{sessions.toLocaleString("ar-EG")}
              </div>
              <div className="text-[10px] font-semibold uppercase leading-snug tracking-wide text-landing-on-dark-subtle sm:text-xs sm:tracking-widest">
                جلسة تفاعلية
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 text-2xl font-black text-white sm:mb-1 sm:text-3xl">
                +{teachers.toLocaleString("ar-EG")}
              </div>
              <div className="text-[10px] font-semibold uppercase leading-snug tracking-wide text-landing-on-dark-subtle sm:text-xs sm:tracking-widest">
                معلم متميز
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 text-2xl font-black text-white sm:mb-1 sm:text-3xl">
                {rating.toLocaleString("ar-EG")} ★
              </div>
              <div className="text-[10px] font-semibold uppercase leading-snug tracking-wide text-landing-on-dark-subtle sm:text-xs sm:tracking-widest">
                تقييم الطلاب
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
