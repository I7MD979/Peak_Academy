import Icon from "@/components/shared/Icon";
import LandingReveal from "@/components/landing/LandingReveal";
import LandingSectionHeader from "@/components/landing/LandingSectionHeader";
import { landingFeatures } from "@/lib/landing-content";

export default function LandingFeatures() {
  return (
    <section
      id="features"
      className="landing-section scroll-mt-20 bg-slate-50 px-4 md:px-8"
      aria-labelledby="features-heading"
    >
      <LandingSectionHeader
        theme="light"
        align="center"
        tag="لماذا نحن"
        title="لماذا Peak Academy؟"
        subtitle="كل ما يحتاجه طالب الإعدادي والثانوي ومعلّمه ووليّ أمره — من الجلسة المباشرة حتى التقرير الأسبوعي."
      />

      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {landingFeatures.map((feature, index) => {
          const title =
            feature.title === "منهج الثانوية العامة"
              ? "منهج الإعدادي والثانوي"
              : feature.title;
          const description =
            feature.title === "منهج الثانوية العامة"
              ? "مواد وشُعب واضحة تناسب احتياجات طلاب الإعدادي والثانوية العامة في مصر."
              : feature.description;

          return (
          <LandingReveal key={feature.title} delay={index * 60}>
            <article className="group h-full rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-accent/25 hover:shadow-md">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                <Icon name={feature.icon} size={22} />
              </span>
              <h3 id={index === 0 ? "features-heading" : undefined} className="text-lg font-bold text-primary">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
            </article>
          </LandingReveal>
          );
        })}
      </div>
    </section>
  );
}
