import Icon from "@/components/shared/Icon";
import { landingFeatures, landingSteps } from "@/lib/landing-content";

export default function LandingFeatures() {
  return (
    <>
      <section className="px-4 py-16 md:px-6 md:py-20" aria-labelledby="features-heading">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center md:mb-12">
            <h2 id="features-heading" className="text-2xl font-black text-primary md:text-3xl">
              لماذا Peak Academy؟
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-text-muted md:text-base">
              كل ما يحتاجه طالب الثانوية العامة ومعلّمه ووليّ أمره — من الجلسة المباشرة حتى التقرير
              الأسبوعي.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {landingFeatures.map((feature) => (
              <article
                key={feature.title}
                className="glass-card rounded-2xl p-5 transition hover:border-accent/30 hover:shadow-md"
              >
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon name={feature.icon} size={22} />
                </span>
                <h3 className="text-lg font-bold text-text">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-y border-border bg-white px-4 py-16 md:px-6 md:py-20"
        aria-labelledby="steps-heading"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 id="steps-heading" className="text-2xl font-black text-primary md:text-3xl">
              كيف تبدأ؟
            </h2>
            <p className="mt-3 text-sm text-text-muted md:text-base">ثلاث خطوات للوصول إلى أول جلسة لايف</p>
          </div>

          <ol className="grid gap-6 md:grid-cols-3">
            {landingSteps.map((item) => (
              <li key={item.step} className="relative rounded-2xl border border-border bg-bg p-6 text-center">
                <span
                  className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-black text-white"
                  aria-hidden="true"
                >
                  {item.step}
                </span>
                <h3 className="text-lg font-bold text-text">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
