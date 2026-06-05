import LandingReveal from "@/components/landing/LandingReveal";
import StatValue from "@/components/landing/StatValue";

function normalizeLandingStats(stats) {
  const items = (stats || []).map((item) => ({
    ...item,
    hint: item.hint?.replace(/الثانوية العامة/g, "إعدادي وثانوي") || item.hint,
    label: item.label?.replace(/الثانوية العامة/g, "إعدادي وثانوي") || item.label
  }));

  if (!items.some((item) => item.label === "مادة دراسية")) {
    items.push({
      value: "12+",
      label: "مادة دراسية",
      hint: "مواد الإعدادي والثانوي"
    });
  }

  return items;
}

export default function LandingStats({ stats }) {
  const items = normalizeLandingStats(stats);
  return (
    <section
      className="landing-stats-bar relative z-10 -mt-1 border-y border-border bg-white"
      aria-labelledby="landing-stats-heading"
    >
      <h2 id="landing-stats-heading" className="sr-only">
        أرقام المنصة
      </h2>
      <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {items.map((item, index) => (
          <LandingReveal key={item.label} delay={index * 80}>
            <div className="landing-stat-item px-6 py-8 text-center transition hover:bg-slate-50 md:py-9">
              <p className="text-4xl font-black text-accent md:text-[2.75rem]">
                <StatValue>{item.value}</StatValue>
              </p>
              <p className="mt-2 text-base font-bold text-primary">{item.label}</p>
              <p className="mt-1 text-xs text-text-muted md:text-sm">{item.hint}</p>
            </div>
          </LandingReveal>
        ))}
      </div>
    </section>
  );
}
