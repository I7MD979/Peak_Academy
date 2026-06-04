import Icon from "@/components/shared/Icon";
import LandingReveal from "@/components/landing/LandingReveal";
import LandingSectionHeader from "@/components/landing/LandingSectionHeader";
import { landingJourneySteps } from "@/lib/landing-content";
import { cn } from "@/lib/utils";

function JourneyPill({ text, variant }) {
  if (!text) return null;
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold",
        variant === "free" && "bg-success/15 text-success",
        variant === "accent" && "bg-accent/15 text-accent",
        !variant && "bg-slate-100 text-text-muted"
      )}
    >
      {text}
    </span>
  );
}

export default function LandingJourney() {
  return (
    <section
      id="journey"
      className="landing-section scroll-mt-20 bg-white px-4 md:px-8"
      aria-labelledby="journey-heading"
    >
      <LandingSectionHeader
        theme="light"
        align="center"
        tag="رحلة التسجيل"
        title="ماذا يحدث بعد ما تضغط «ابدأ مجاناً»؟"
        subtitle="مسار واضح من أول ثانية — بدون خطوات مخفية."
      />

      <div className="mx-auto max-w-3xl">
        <ol className="relative space-y-0">
          <div
            className="absolute bottom-6 right-[1.35rem] top-6 w-px bg-gradient-to-b from-accent/40 via-border to-transparent md:right-6"
            aria-hidden="true"
          />
          {landingJourneySteps.map((step, index) => (
            <LandingReveal key={step.title} delay={index * 90}>
              <li className="relative flex gap-4 pb-8 md:gap-6">
                <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-accent/30 bg-white text-accent shadow-md md:h-12 md:w-12">
                  <Icon name={step.icon} size={20} />
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-border bg-white p-4 shadow-sm md:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      id={index === 0 ? "journey-heading" : undefined}
                      className="text-base font-bold text-primary md:text-lg"
                    >
                      {step.title}
                    </h3>
                    <JourneyPill text={step.pill} variant={step.pillVariant} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{step.description}</p>
                </div>
              </li>
            </LandingReveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
