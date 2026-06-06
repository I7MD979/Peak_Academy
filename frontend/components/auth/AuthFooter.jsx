import Link from "next/link";
import PeakLogo from "@/components/shared/PeakLogo";

const links = [
  { label: "سياسة الخصوصية", href: "/privacy" },
  { label: "شروط الاستخدام", href: "/terms" },
  { label: "الدعم", href: "mailto:support@peak-academy.net" }
];

export default function AuthFooter() {
  return (
    <footer className="mt-auto w-full border-t border-auth-outline-variant bg-auth-surface-lowest py-8">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-8">
        <PeakLogo href="/" variant="compact" className="opacity-90" />
        <div className="flex flex-wrap justify-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-auth-on-surface-variant transition-colors hover:text-auth-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="text-sm text-auth-secondary">© {new Date().getFullYear()} Peak Academy</div>
      </div>
    </footer>
  );
}
