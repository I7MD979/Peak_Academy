import Link from "next/link";
import LandingWaveDivider from "@/components/landing/LandingWaveDivider";

export default function LandingCTA() {
  return (
    <>
      <LandingWaveDivider fill="navy" flip />
      <section className="scroll-reveal landing-section-dark landing-pattern-dark relative overflow-hidden landing-section-y">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[min(800px,120vw)] w-[min(800px,120vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-landing-orange/[0.12] blur-[120px] sm:blur-[150px]"
          aria-hidden="true"
        />

        <div className="landing-container relative z-10 text-center">
          <div className="mb-8 inline-flex h-20 w-20 rotate-12 items-center justify-center rounded-3xl border border-landing-orange/30 bg-white/[0.08] backdrop-blur-xl sm:mb-10 sm:h-24 sm:w-24">
            <span className="material-symbols-outlined -rotate-12 text-4xl text-landing-orange sm:text-5xl">
              terrain
            </span>
          </div>

          <h2 className="landing-h2 mb-5 text-white sm:mb-6 md:text-5xl lg:text-6xl">
            هل أنت مستعد <span className="landing-title-mark">للقمة</span>؟
          </h2>
          <p className="landing-lead mx-auto mb-10 text-landing-on-dark-muted sm:mb-12">
            انضم اليوم إلى آلاف الطلاب المتميزين وابدأ رحلة نجاحك مع Peak Academy.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link href="/auth/register" className="landing-btn-primary w-full sm:w-auto">
              سجّل الآن مجاناً
            </Link>
            <Link href="/auth/login" className="landing-btn-outline w-full sm:w-auto">
              لدي حساب
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
