import Link from "next/link";
import { registerHrefForLevel } from "@/lib/level-params";

const LEVELS = [
  {
    key: "prep",
    step: "01. التأسيس",
    title: "المرحلة الإعدادية",
    description: "نركز على بناء مهارات التفكير العلمي والمنطقي، لنؤهل الطلاب لمستقبل مشرق.",
    tags: ["الرياضيات", "العلوم", "اللغات"],
    cardClass: "landing-card-light",
    tagClass: "border border-landing-ink/10 bg-landing-cream text-landing-ink hover:border-landing-orange/30 hover:bg-white",
    textClass: "text-landing-ink",
    descClass: "text-landing-ink-muted",
    stepClass: "text-landing-orange",
    linkClass: "text-landing-ink hover:text-landing-orange"
  },
  {
    key: "sec",
    step: "02. الاحتراف",
    title: "الثانوية العامة",
    description: "إعداد شامل واحترافي للامتحانات مع نخبة من الأساتذة، لضمان الوصول لكلية أحلامك.",
    tags: ["الفيزياء", "الكيمياء", "الرياضيات"],
    cardClass: "landing-card-navy",
    tagClass: "border border-white/15 bg-white/10 text-white hover:border-landing-orange/40 hover:bg-white/15",
    textClass: "text-white",
    descClass: "text-landing-on-dark-muted",
    stepClass: "text-landing-orange",
    linkClass: "text-white hover:text-landing-orange"
  }
];

export default function LandingLevels() {
  return (
    <section id="levels" className="scroll-reveal landing-section-light landing-pattern-dots landing-section-y">
      <div className="landing-container">
        <div className="landing-section-head">
          <span className="landing-section-tag-light mb-4 inline-block sm:mb-5">المناهج</span>
          <h2 className="landing-h2 text-landing-ink">
            <span className="landing-title-mark ml-2 sm:ml-3">▲▲</span>
            اختر رحلتك التعليمية
          </h2>
          <p className="landing-lead text-landing-ink-muted">
            تجربة تعليمية متكاملة مصممة خصيصاً لكل مرحلة دراسية
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {LEVELS.map((level) => (
            <div
              key={level.key}
              className={`group relative overflow-hidden rounded-3xl p-7 transition-all duration-700 hover:-translate-y-1 sm:p-9 md:p-12 ${level.cardClass}`}
            >
              <div className="relative z-10">
                <div className={`mb-6 text-xs font-bold uppercase tracking-widest sm:mb-8 sm:text-sm ${level.stepClass}`}>
                  {level.step}
                </div>
                <h3 className={`mb-4 text-3xl font-black sm:mb-6 sm:text-4xl ${level.textClass}`}>{level.title}</h3>
                <p className={`mb-8 text-base leading-relaxed sm:mb-10 sm:text-lg ${level.descClass}`}>
                  {level.description}
                </p>
                <div className="mb-10 flex flex-wrap gap-2 sm:mb-12 sm:gap-3 md:mb-14">
                  {level.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors sm:px-5 sm:py-2.5 sm:text-sm ${level.tagClass}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={registerHrefForLevel(level.key)}
                  className={`inline-flex items-center gap-2 font-bold transition-all group-hover:gap-4 sm:gap-3 ${level.linkClass}`}
                >
                  <span>ابدأ التسجيل</span>
                  <span className="text-landing-orange">→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
