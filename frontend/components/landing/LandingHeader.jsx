"use client";

import { useState } from "react";
import Link from "next/link";
import PeakLogo from "@/components/shared/PeakLogo";
import Icon from "@/components/shared/Icon";
import { Button } from "@/components/ui/button";
import { landingNavLinks } from "@/lib/landing-content";
import { cn } from "@/lib/utils";

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="landing-header sticky top-0 z-50 border-b border-border/80 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 md:px-8">
        <Link
          href="/"
          className="shrink-0 transition-opacity hover:opacity-90"
          aria-label="الصفحة الرئيسية — Peak Academy"
        >
          <PeakLogo theme="light" subtitle="منصة الثانوية العامة" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="تنقل الصفحة">
          {landingNavLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToSection(link.id)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-text-muted transition hover:bg-slate-100 hover:text-primary"
            >
              {link.label}
            </button>
          ))}
          <Link
            href="/auth/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-text-muted transition hover:bg-slate-100 hover:text-primary"
          >
            تسجيل الدخول
          </Link>
          <Button
            href="/auth/register"
            variant="accent"
            size="sm"
            className="mr-1 shadow-md shadow-accent/25"
          >
            ابدأ مجاناً
          </Button>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <Button href="/auth/register" variant="accent" size="sm" className="shadow-md shadow-accent/20">
            ابدأ
          </Button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-primary"
            aria-expanded={menuOpen}
            aria-label="فتح القائمة"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={20} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-border bg-white lg:hidden",
          menuOpen ? "block" : "hidden"
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="قائمة الجوال">
          {landingNavLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              className="rounded-xl px-3 py-3 text-start text-sm font-semibold text-text hover:bg-slate-50"
              onClick={() => {
                scrollToSection(link.id);
                setMenuOpen(false);
              }}
            >
              {link.label}
            </button>
          ))}
          <Link
            href="/auth/login"
            className="rounded-xl px-3 py-3 text-sm font-semibold text-text hover:bg-slate-50"
            onClick={() => setMenuOpen(false)}
          >
            تسجيل الدخول
          </Link>
        </nav>
      </div>
    </header>
  );
}
