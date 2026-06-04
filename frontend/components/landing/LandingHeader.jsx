import Link from "next/link";
import PeakLogo from "@/components/shared/PeakLogo";
import { Button } from "@/components/ui/button";

export default function LandingHeader() {
  return (
    <header className="landing-header sticky top-0 z-50 border-b border-white/10 bg-primary/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="shrink-0" aria-label="الصفحة الرئيسية — Peak Academy">
          <PeakLogo theme="dark" subtitle="منصة الثانوية العامة" />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="تنقل رئيسي">
          <Link
            href="/auth/login"
            className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 sm:inline-block"
          >
            تسجيل الدخول
          </Link>
          <Button href="/auth/register" variant="accent" size="sm" className="shadow-md shadow-accent/25">
            ابدأ مجاناً
          </Button>
        </nav>
      </div>
    </header>
  );
}
