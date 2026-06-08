import { resolveQuickStats } from "@/lib/landing-api";
import { landingQuickStatsFallback } from "@/lib/landing-constants";

export default function LandingStats({ stats }) {
  const items = resolveQuickStats(stats, landingQuickStatsFallback);

  return (
    <section className="landing-section-light landing-pattern-light relative z-20 pb-16 pt-0 sm:pb-20 md:pb-24">
      <div className="landing-container relative -mt-10 sm:-mt-14 md:-mt-16">
        <div className="scroll-reveal landing-card-light grid grid-cols-2 gap-4 rounded-3xl p-5 sm:gap-6 sm:p-8 md:grid-cols-4 md:gap-8 md:px-10 md:py-9">
          {items.map((item) => (
            <div key={item.title} className="flex flex-col items-center gap-2 text-center sm:gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-landing-orange/10 text-landing-orange sm:h-14 sm:w-14">
                <span className="material-symbols-outlined text-xl sm:text-2xl">{item.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-landing-ink sm:text-base">{item.title}</div>
                {item.sub ? (
                  <div className="mt-0.5 text-[11px] text-landing-ink-muted sm:text-xs">{item.sub}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
