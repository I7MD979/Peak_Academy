import Icon from "@/components/shared/Icon";
import { Button } from "@/components/ui/button";

export default function LandingHero() {
  return (
    <section className="landing-hero relative overflow-hidden px-4 pb-20 pt-10 md:px-8 md:pb-24 md:pt-14">
      <div className="landing-hero-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <p className="landing-hero-badge landing-fade-in mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent md:text-sm">
          <span className="landing-pulse-dot h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          <Icon name="live" size={14} className="text-accent" />
          منصة تعليمية مصرية — ثانوية عامة
        </p>

        <h1 className="landing-fade-in landing-delay-1 text-3xl font-black leading-tight text-white md:text-5xl lg:text-6xl">
          وصّل للقمة مع{" "}
          <span dir="ltr" lang="en" className="inline-block whitespace-nowrap text-accent">
            Peak Academy
          </span>
        </h1>

        <p className="landing-fade-in landing-delay-2 mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
          جلسات لايف تفاعلية، متابعة لوليّ الأمر، ومعلّمون على منهج الثانوية العامة — في تجربة واحدة
          عصرية وسهلة الاستخدام.
        </p>

        <div className="landing-fade-in landing-delay-3 mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button
            href="/auth/register"
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
