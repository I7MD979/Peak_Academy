"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PeakLogo from "@/components/shared/PeakLogo";
import { landingNavLinks } from "@/lib/landing-constants";
import { cn } from "@/lib/utils";

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lightHeader, setLightHeader] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setLightHeader(y > window.innerHeight * 0.65);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLinkClass = lightHeader
    ? "text-sm font-bold text-landing-ink-muted transition-colors hover:text-landing-ink"
    : "text-sm font-bold text-landing-on-dark-subtle transition-colors hover:text-white";

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full border-b transition-all duration-300",
        lightHeader
          ? "border-landing-ink/8 bg-white/95 shadow-[0_4px_24px_-8px_rgba(8,13,22,0.1)] backdrop-blur-xl"
          : scrolled
            ? "border-white/10 bg-landing-navy/90 backdrop-blur-2xl"
            : "border-white/5 bg-landing-navy/60 backdrop-blur-xl"
      )}
    >
      <nav className="relative mx-auto flex h-[4.5rem] max-w-[75rem] flex-row-reverse items-center justify-between gap-3 px-4 sm:h-20 sm:gap-4 sm:px-6 md:px-8">
        <PeakLogo
          href="/"
          variant="landing"
          showWordmark
          priority
          theme={lightHeader ? "light" : "dark"}
        />

        <ul className="hidden items-center gap-8 md:flex">
          {landingNavLinks.map((link) => (
            <li key={link.id}>
              <a href={`#${link.id}`} className={navLinkClass}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className={cn(
              "hidden rounded-full px-5 py-2 text-sm font-bold transition-colors sm:inline-flex",
              lightHeader ? "text-landing-ink/80 hover:text-landing-ink" : "text-landing-on-dark-muted hover:text-white"
            )}
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/auth/register"
            className={cn(
              "rounded-full px-4 py-2 text-xs font-bold transition-all duration-300 sm:px-6 sm:py-2.5 sm:text-sm",
              lightHeader
                ? "bg-landing-orange text-white shadow-[0_8px_24px_-8px_rgba(245,114,26,0.45)] hover:bg-landing-navy"
                : "bg-white text-landing-navy hover:bg-landing-orange hover:text-white"
            )}
          >
            ابدأ الآن
          </Link>
          <button
            type="button"
            className={cn(
              "inline-flex rounded-lg p-2 transition-colors md:hidden",
              lightHeader ? "text-landing-ink hover:bg-landing-cream" : "text-landing-on-dark-muted hover:bg-white/10"
            )}
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileOpen}
          >
            <span className="material-symbols-outlined">{mobileOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div
          className={cn(
            "border-t px-5 py-4 md:hidden",
            lightHeader ? "border-landing-ink/8 bg-white/98" : "border-white/10 bg-landing-navy/95"
          )}
        >
          <ul className="space-y-1">
            {landingNavLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded-xl px-4 py-3 text-sm font-bold transition-colors",
                    lightHeader
                      ? "text-landing-ink/80 hover:bg-landing-cream hover:text-landing-ink"
                      : "text-landing-on-dark-muted hover:bg-white/5 hover:text-white"
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-xl px-4 py-3 text-sm font-bold transition-colors",
                  lightHeader
                    ? "text-landing-ink/80 hover:bg-landing-cream hover:text-landing-ink"
                    : "text-landing-on-dark-muted hover:bg-white/5 hover:text-white"
                )}
              >
                تسجيل الدخول
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}
