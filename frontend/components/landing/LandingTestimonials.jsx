const testimonials = [
  {
    initials: "أ.م",
    name: "أحمد محمد",
    level: "طالب 3 ثانوي",
    quote:
      "تجربة الأونلاين في Peak Academy مختلفة تماماً، شعرت باهتمام حقيقي وتفاعل لم أجده في أي منصة أخرى.",
    cardClass: "landing-card-light",
    accent: "bg-landing-orange text-white",
    nameClass: "text-landing-ink",
    levelClass: "text-landing-ink-muted",
    quoteClass: "text-landing-ink-muted"
  },
  {
    initials: "س.ع",
    name: "سارة علي",
    level: "طالبة 2 إعدادي",
    quote: "المدرسون رائعون جداً، والتفاعل المباشر مكنّني من طرح كافة أسئلتي بكل أريحية.",
    cardClass: "landing-card-navy",
    accent: "bg-white/10 text-landing-orange border border-landing-orange/25",
    nameClass: "text-white",
    levelClass: "text-landing-on-dark-subtle",
    quoteClass: "text-landing-on-dark-muted"
  },
  {
    initials: "م.س",
    name: "محمود سامي",
    level: "طالب 1 ثانوي",
    quote: "ساعدتني المنصة على تنظيم وقتي والتفوق في المواد التي كنت أخشاها، شكراً Peak Academy.",
    cardClass: "landing-card-light",
    accent: "bg-landing-cream text-landing-orange border border-landing-ink/[0.08]",
    nameClass: "text-landing-ink",
    levelClass: "text-landing-ink-muted",
    quoteClass: "text-landing-ink-muted"
  }
];

export default function LandingTestimonials() {
  return (
    <section className="scroll-reveal landing-section-cream landing-pattern-light landing-section-y">
      <div className="landing-container">
        <div className="landing-section-head">
          <span className="landing-section-tag-light mb-4 inline-block sm:mb-5">آراء الطلاب</span>
          <h2 className="landing-h2 text-landing-ink">
            قصص نجاح <span className="landing-title-mark">ملهمة</span>
          </h2>
          <p className="landing-lead text-landing-ink-muted">فخورون بطلابنا الذين حققوا أحلامهم معنا</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className={`rounded-3xl p-7 transition-all duration-500 hover:-translate-y-1 sm:p-8 md:p-9 ${item.cardClass}`}
            >
              <div className="mb-6 flex items-center gap-4 sm:mb-7 sm:gap-5">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold sm:h-16 sm:w-16 sm:text-xl ${item.accent}`}
                >
                  {item.initials}
                </div>
                <div className="min-w-0">
                  <div className={`truncate text-base font-bold sm:text-lg ${item.nameClass}`}>{item.name}</div>
                  <div className={`text-xs font-semibold uppercase ${item.levelClass}`}>{item.level}</div>
                </div>
              </div>
              <p className={`text-base italic leading-relaxed sm:text-lg ${item.quoteClass}`}>
                &ldquo;{item.quote}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
