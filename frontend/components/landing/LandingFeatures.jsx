export default function LandingFeatures() {
  return (
    <section id="features" className="scroll-reveal landing-section-dark landing-pattern-dark landing-section-y">
      <div className="landing-container">
        <div className="landing-section-head">
          <span className="landing-section-tag-dark mb-4 inline-block sm:mb-5">المميزات</span>
          <h2 className="landing-h2 text-white">
            لماذا تختار <span className="landing-title-mark">Peak Academy</span>؟
          </h2>
          <p className="landing-lead text-landing-on-dark-muted">نجمع بين أحدث التقنيات وأفضل الكوادر التعليمية</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6 lg:gap-8">
          <div className="landing-card-accent-top landing-card-accent-featured relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.12] bg-white/[0.05] p-7 transition-all duration-700 hover:border-landing-orange/25 hover:shadow-2xl sm:p-9 md:col-span-8 md:p-11 lg:p-14">
            <div className="absolute right-0 top-0 h-full w-full bg-gradient-to-br from-landing-orange/[0.12] via-transparent to-transparent" />
            <div className="relative z-10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-landing-orange/25 bg-landing-orange/10 text-landing-orange backdrop-blur-xl sm:mb-8 sm:h-16 sm:w-16">
                <span className="material-symbols-outlined text-2xl sm:text-3xl">person_pin</span>
              </div>
              <h3 className="mb-4 text-2xl font-black text-white sm:mb-6 sm:text-3xl">اهتمام شخصي وتفاعل حقيقي</h3>
              <p className="max-w-xl text-base leading-relaxed text-landing-on-dark-muted sm:text-lg md:text-xl">
                نضمن لكل طالب متابعة واضحة وفرصة للمشاركة، مع شرح يركز على الفهم العميق وبناء الثقة في
                المادة.
              </p>
            </div>
          </div>

          <div className="landing-card-navy rounded-3xl p-7 transition-all duration-700 hover:-translate-y-1 hover:border-landing-orange/20 sm:p-9 md:col-span-4 md:p-10 lg:p-12">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-landing-orange/15 text-landing-orange sm:mb-8 sm:h-14 sm:w-14">
              <span className="material-symbols-outlined text-2xl">live_tv</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-white sm:mb-4 sm:text-2xl">حصص مباشرة</h3>
            <p className="text-sm leading-relaxed text-landing-on-dark-muted sm:text-base">
              تفاعل حي ومباشر مع المعلم، اطرح أسئلتك واحصل على إجابات فورية.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition-all duration-700 hover:-translate-y-1 hover:border-landing-orange/25 sm:p-9 md:col-span-4 md:p-10 lg:p-12">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08] text-landing-orange sm:mb-8 sm:h-14 sm:w-14">
              <span className="material-symbols-outlined text-2xl">monitoring</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-white sm:mb-4 sm:text-2xl">تقارير المتابعة</h3>
            <p className="text-sm leading-relaxed text-landing-on-dark-muted sm:text-base">
              نظام متابعة دقيق لولي الأمر، يشمل الأداء الدراسي والحضور والغياب.
            </p>
          </div>

          <div className="rounded-3xl border border-landing-orange/35 bg-gradient-to-br from-landing-orange/95 to-[#e05f0a] p-7 transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_20px_50px_-12px_rgba(245,114,26,0.45)] sm:p-9 md:col-span-4 md:p-10 lg:p-12">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white sm:mb-8 sm:h-14 sm:w-14">
              <span className="material-symbols-outlined text-2xl">auto_stories</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-white sm:mb-4 sm:text-2xl">محتوى حصري</h3>
            <p className="text-sm leading-relaxed text-white sm:text-base">
              ملازم PDF، ملخصات، وبنك أسئلة يغطي كافة جوانب المنهج.
            </p>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-landing-navy/60 p-7 transition-all duration-700 hover:-translate-y-1 hover:border-white/15 sm:p-9 md:col-span-4 md:p-10 lg:p-12">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-white sm:mb-8 sm:h-14 sm:w-14">
              <span className="material-symbols-outlined text-2xl">savings</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-white sm:mb-4 sm:text-2xl">تكلفة ذكية</h3>
            <p className="text-sm leading-relaxed text-landing-on-dark-muted sm:text-base">
              نقدم أعلى جودة تعليمية بأفضل سعر تنافسي لتسهيل التعليم للجميع.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
