import Link from "next/link";
import PeakLogo from "@/components/shared/PeakLogo";
import { landingNavLinks } from "@/lib/landing-content";

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-white px-4 py-10 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 md:flex-row md:items-start">
        <PeakLogo theme="light" subtitle="تعليم الثانوية العامة في مصر" />
        <nav className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-text-muted">
          {landingNavLinks.map((link) => (
            <Link key={link.id} href={`/#${link.id}`} className="transition hover:text-primary">
              {link.label}
            </Link>
          ))}
          <Link href="/auth/register" className="transition hover:text-primary">
            التسجيل
          </Link>
          <Link href="/auth/login" className="transition hover:text-primary">
            تسجيل الدخول
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-center text-xs text-text-muted md:text-end">
        © {year}{" "}
        <span dir="ltr" lang="en" className="inline-block">
          Peak Academy
        </span>
        . جميع الحقوق محفوظة.
      </p>
    </footer>
  );
}
