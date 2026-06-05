"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/shared/Icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LEVEL_TABS = [
  { key: "prep", label: "أنا طالب إعدادي", href: "/auth/register?level=prep" },
  { key: "sec", label: "أنا طالب ثانوي", href: "/auth/register?level=sec" }
];

export default function LandingHero() {
  const [activeLevel, setActiveLevel] = useState("sec");

  return (
    <section className="landing-hero relative overflow-hidden px-4 pb-20 pt-10 md:px-8 md:pb-24 md:pt-14">
      <div className="landing-hero-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <p className="landing-hero-badge landing-fade-in mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent md:text-sm">
          <span className="landing-pulse-dot h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          <Icon name="live" size={14} className="text-accent" />
          منصة تعليمية مصرية — إعدادي وثانوي
        </p>

        <h1 className="landing-fade-in landing-delay-1 text-3xl font-black leading-tight text-white md:text-5xl lg:text-6xl">
          وصّل للقمة مع{" "}
          <span dir="ltr" lang="en" className="inline-block whitespace-nowrap text-accent">
            Peak Academy
          </span>
        </h1>

        <p className="landing-fade-in landing-delay-2 mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
          جلسات لايف تفاعلية لطلاب الإعدادي والثانوية العامة — في مجموعات صغيرة مع أفضل
          المعلمين
        </p>

        <div
          className="landing-fade-in landing-delay-3 mx-auto mt-8 inline-flex max-w-md flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 p-1.5"
          role="tablist"
          aria-label="اختر مرحلتك الدراسية"
        >
          {LEVEL_TABS.map((tab) => {
            const active = activeLevel === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveLevel(tab.key)}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-bold transition-colors md:px-5",
                  active
                    ? "bg-accent text-white shadow-md shadow-accent/25"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="landing-fade-in landing-delay-3 mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button
            href={LEVEL_TABS.find((tab) => tab.key === activeLevel)?.href || "/auth/register"}
            variant="accent"
            size="lg"
            className="w-full min-w-[200px] shadow-lg shadow-accent/30 sm:order-1 sm:w-auto"
          >
            ابدأ مجاناً
            <Icon name="arrowRight" size={18} className="rotate-180" />
          </Button>
          <Button
            href="/auth/login"
            size="lg"
            className="w-full min-w-[200px] border-0 bg-white text-primary shadow-lg shadow-black/15 hover:bg-slate-100 sm:order-2 sm:w-auto"
          >
            تسجيل الدخول
          </Button>
        </div>

        <ul className="landing-fade-in landing-delay-4 mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-white/55 md:text-sm">
          {[
            "بدون بطاقة عند التسجيل",
            "أول حصة مجانية",
            "واجهة عربية كاملة"
          ].map((text) => (
            <li key={text} className="flex items-center gap-2">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent/20 text-[10px] text-accent">
                <Icon name="check" size={12} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="landing-wave pointer-events-none" aria-hidden="true" />
    </section>
  );
}
