"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import LandingSelect from "@/components/landing/LandingSelect";
import { registerHrefForLevel } from "@/lib/level-params";
import { resolveHeroCounters } from "@/lib/landing-api";

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

export default function LandingHero({ heroPromo, platformStats }) {
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
        if (entry.isIntersecting) setStatsActive(true);
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="landing-hero relative flex min-h-[100dvh] min-h-screen items-center overflow-hidden bg-landing-navy pb-10 pt-[4.75rem] text-white sm:pb-14 sm:pt-24 md:pb-16">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute inset-0 animate-float">
          <svg
            viewBox="0 0 800 600"
            className="absolute bottom-0 left-0 right-0 h-full w-full object-cover opacity-30"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMax slice"
          >
            <polygon points="400,80 720,520 80,520" fill="none" stroke="#f5721a" strokeWidth="1.5" opacity="0.5" />
            <polygon points="400,140 650,480 150,480" fill="#f5721a" opacity="0.07" />
            <polygon points="400,80 520,320 280,320" fill="#f5721a" opacity="0.12" />
            <polygon points="580,200 760,500 400,500" fill="none" stroke="#f5721a" strokeWidth="0.8" opacity="0.25" />
            <polygon points="220,240 420,500 20,500" fill="none" stroke="#bbc7df" strokeWidth="0.8" opacity="0.2" />
            <circle cx="400" cy="80" r="6" fill="#f5721a" opacity="0.9" />
            <circle cx="400" cy="80" r="20" fill="#f5721a" opacity="0.15" />
            <line x1="400" y1="80" x2="720" y2="520" stroke="#f5721a" strokeWidth="0.5" opacity="0.3" />
            <line x1="400" y1="80" x2="80" y2="520" stroke="#f5721a" strokeWidth="0.5" opacity="0.3" />
          </svg>
        </div>
        <div className="absolute inset-0 bg-gradient-to-l from-landing-navy via-landing-navy/88 to-landing-navy/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-landing-navy via-landing-navy/55 to-transparent" />
        <div className="landing-hero-glow absolute inset-0 opacity-90" />
      </div>

      <div className="landing-container relative z-10">
        <div className="scroll-reveal visible flex max-w-3xl flex-col items-start text-right">
          <div className="mb-6 flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm sm:mb-8 sm:px-5">
            <span className="landing-pulse-dot h-2 w-2 shrink-0 rounded-full bg-landing-orange" />
            <span className="truncate text-xs font-bold tracking-wide text-landing-on-dark-muted">{heroPromo}</span>
          </div>

          <h1 className="mb-6 font-black sm:mb-8">
            <span className="landing-hero-display block text-white">مش بس حصص</span>
            <span className="landing-hero-accent flex flex-wrap items-center gap-2 text-landing-orange sm:gap-4">
              ده مستقبلك <span className="animate-pulse">↗</span>
            </span>
            <span className="landing-hero-tagline mt-2 block font-bold text-landing-on-dark-muted sm:mt-4">وصل للقمة</span>
          </h1>

          <p className="mb-8 max-w-xl text-base leading-relaxed text-landing-on-dark-muted sm:mb-10 sm:text-lg md:text-xl">
            تجربة تعليمية تفاعلية حديثة للمرحلة الإعدادية والثانوية. معلّمون متميزون ومتابعة شخصية تساعدك على
            التفوق والوصول إلى القمة.
          </p>

          <div className="mb-8 w-full max-w-md sm:mb-10">
            <p className="mb-2 text-xs font-semibold text-landing-on-dark-subtle sm:mb-3">اختر مرحلتك الدراسية</p>
            <div className="hidden rounded-2xl border border-white/5 bg-white/5 p-1 backdrop-blur-sm sm:inline-flex">
              {LEVEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActiveTab(option.value)}
                  className="rounded-xl px-6 py-3 text-sm font-bold transition-all md:px-8 md:py-3.5"
                  style={
                    activeTab === option.value
                      ? {
                          background: "#f5721a",
                          color: "white",
                          boxShadow: "0 4px 20px rgba(245,114,26,0.2)"
                        }
                      : { color: "rgba(255, 255, 255, 0.72)" }
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="sm:hidden">
              <LandingSelect
                value={activeTab}
                onChange={setActiveTab}
                options={LEVEL_OPTIONS}
                aria-label="المرحلة الدراسية"
              />
            </div>
          </div>

          <div className="mb-10 flex w-full flex-col gap-3 sm:mb-14 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4">
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
            className="grid w-full grid-cols-3 gap-3 rounded-2xl border border-white/12 bg-landing-navy/50 p-4 pt-6 backdrop-blur-md sm:flex sm:flex-wrap sm:gap-10 sm:p-5 sm:pt-8 md:gap-16"
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
