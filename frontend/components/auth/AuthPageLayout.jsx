import Link from "next/link";
import PeakLogo from "@/components/shared/PeakLogo";
import { FOOTER_CONTACT_LINK, FOOTER_LEGAL_LINKS } from "@/lib/legal-pages";

const footerLinks = [
  { label: "سياسة الخصوصية", href: "/privacy" },
  { label: "شروط الاستخدام", href: "/terms" },
  ...FOOTER_LEGAL_LINKS.filter((page) => page.slug !== "privacy" && page.slug !== "terms").map((page) => ({
    label: page.title,
    href: page.href
  })),
  { label: FOOTER_CONTACT_LINK.label, href: FOOTER_CONTACT_LINK.href }
];

export default function AuthPageLayout({ children }) {
  return (
    <div className="auth-page-shell font-cairo" dir="rtl">
      <header dir="rtl" className="fixed top-0 z-50 flex h-14 w-full items-center justify-between border-b border-outline-variant/80 bg-surface-container/90 px-4 backdrop-blur-md sm:h-16 sm:px-6 md:px-8">
        <PeakLogo href="/" variant="compact" showSubtitle={false} priority />
        <Link
          href="mailto:support@peak-academy.net"
          className="text-sm text-on-surface-variant transition-colors hover:text-md-primary"
        >
          مساعدة
        </Link>
      </header>

      <main className="auth-page-main">{children}</main>

      <footer className="w-full shrink-0 border-t border-outline-variant bg-surface-container-lowest py-5 sm:py-6">
        <div className="mx-auto flex max-w-[75rem] flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:gap-6 sm:px-6 sm:text-start md:px-8">
          <div className="text-xs font-bold uppercase tracking-widest text-on-surface">PEAK ACADEMY</div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-on-surface-variant">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-md-primary">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="text-sm text-secondary">© {new Date().getFullYear()} Peak Academy</div>
        </div>
      </footer>
    </div>
  );
}
