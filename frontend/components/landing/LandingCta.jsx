import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";
import LandingReveal from "@/components/landing/LandingReveal";

export default function LandingCta() {
  return (
    <section className="landing-section bg-slate-50 px-4 md:px-8" aria-labelledby="cta-heading">
      <LandingReveal>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border bg-white px-6 py-12 text-center shadow-lg md:px-12 md:py-14">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/5 via-white to-white"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <h2 id="cta-heading" className="text-2xl font-black text-primary md:text-4xl">
              جاهز توصّل للقمة؟
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted md:text-base">
              أنشئ حسابك الآن واختر دورك — طالب، معلّم، أو وليّ أمر — وابدأ أول جلسة في دقائق.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                href="/auth/register"
                variant="accent"
                size="lg"
                className="min-w-[220px] shadow-lg shadow-accent/30"
              >
                إنشاء حساب مجاني
                <Icon name="arrowRight" size={18} className="rotate-180" />
              </Button>
              <Button href="/auth/login" variant="outline" size="lg" className="min-w-[220px]">
                لديّ حساب بالفعل
              </Button>
            </div>
          </div>
        </div>
      </LandingReveal>
    </section>
  );
}
