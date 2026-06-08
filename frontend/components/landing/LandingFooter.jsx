import Link from "next/link";
import PeakLogo from "@/components/shared/PeakLogo";

const platformLinks = [
  { label: "إنشاء حساب", href: "/auth/register" },
  { label: "تسجيل الدخول", href: "/auth/login" },
  { label: "الأسعار", href: "#pricing" },
  { label: "المناهج", href: "#levels" }
];

const legalLinks = [
  { label: "سياسة الخصوصية", href: "/privacy" },
  { label: "الشروط والأحكام", href: "/terms" },
  { label: "تواصل معنا", href: "mailto:support@peak-academy.net" }
];

export default function LandingFooter() {
  return (
    <footer className="landing-section-dark border-t border-white/[0.08] py-14 sm:py-16 md:py-20">
      <div className="landing-container grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-12 md:grid-cols-4 md:gap-14">
        <div className="sm:col-span-2">
          <PeakLogo href="/" variant="full" showWordmark theme="dark" className="mb-6 sm:mb-8 md:hidden" />
          <PeakLogo href="/" variant="full" showWordmark theme="dark" className="mb-6 hidden sm:mb-8 md:flex" />
          <p className="max-w-sm text-base leading-relaxed text-landing-on-dark-muted sm:text-lg">
            رؤيتنا تمكين كل طالب من خلال تعليم تفاعلي عالي الجودة يتجاوز الحدود التقليدية.
          </p>
        </div>

        <div>
          <h4 className="mb-5 text-base font-bold text-white sm:mb-6 sm:text-lg">المنصة</h4>
          <ul className="space-y-3 sm:space-y-4">
            {platformLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-landing-on-dark-subtle transition-colors hover:text-landing-orange sm:text-base">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-5 text-base font-bold text-white sm:mb-6 sm:text-lg">القانونية</h4>
          <ul className="space-y-3 sm:space-y-4">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-landing-on-dark-subtle transition-colors hover:text-landing-orange sm:text-base">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="landing-container mt-12 border-t border-white/10 pt-8 text-center sm:mt-14 md:mt-16">
        <p className="text-xs font-medium text-landing-on-dark-subtle sm:text-sm">
          © {new Date().getFullYear()} Peak Academy — أكاديمية الذروة. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
