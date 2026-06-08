import LandingWaveDivider from "@/components/landing/LandingWaveDivider";

const steps = [
  { icon: "person_add", title: "سجّل حسابك", desc: "عملية تسجيل سريعة في ثوانٍ معدودة" },
  { icon: "menu_book", title: "اختر مرحلتك", desc: "حدد المواد والأساتذة الذين تفضلهم" },
  { icon: "event", title: "احجز حصتك", desc: "اختر الموعد المناسب لجدولك الدراسي" },
  { icon: "rocket_launch", title: "انطلق للقمة", desc: "ابدأ التعلم التفاعلي وحقق أهدافك" }
];

export default function LandingHowItWorks() {
  return (
    <>
      <LandingWaveDivider fill="cream" />
      <section id="how" className="scroll-reveal landing-section-cream landing-pattern-light landing-section-y">
        <div className="landing-container">
          <div className="landing-section-head">
            <span className="landing-section-tag-light mb-4 inline-block sm:mb-5">البداية</span>
            <h2 className="landing-h2 text-landing-ink">
              <span className="landing-title-mark ml-2 sm:ml-3">▲</span>
              كيف تبدأ رحلة القمة؟
            </h2>
            <p className="landing-lead text-landing-ink-muted">خطوات بسيطة تفصلك عن أقوى تجربة تعليمية</p>
          </div>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-6">
            {steps.map((step) => (
              <div key={step.title} className="group text-center">
                <div className="relative mx-auto mb-6 h-24 w-24 sm:mb-8 sm:h-28 sm:w-28">
                  <div className="absolute inset-0 rotate-12 rounded-3xl bg-landing-orange/[0.08] transition-all duration-500 group-hover:rotate-0" />
                  <div className="landing-card-light relative flex h-full w-full items-center justify-center rounded-3xl">
                    <span className="material-symbols-outlined text-3xl text-landing-orange sm:text-4xl">
                      {step.icon}
                    </span>
                  </div>
                </div>
                <h4 className="mb-2 text-lg font-bold text-landing-ink sm:mb-3 sm:text-xl">{step.title}</h4>
                <p className="mx-auto max-w-[16rem] px-2 text-sm text-landing-ink-muted sm:px-4">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <LandingWaveDivider fill="navy" flip />
    </>
  );
}
