import { Card, CardContent } from "@/components/ui/card";
import { landingStats } from "@/lib/landing-content";
import StatValue from "@/components/landing/StatValue";

export default function LandingStats() {
  return (
    <section className="relative z-10 -mt-6 px-4 md:-mt-10 md:px-6" aria-labelledby="landing-stats-heading">
      <h2 id="landing-stats-heading" className="sr-only">
        أرقام المنصة
      </h2>
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3 md:gap-5">
        {landingStats.map((item, index) => (
          <Card
            key={item.label}
            className="landing-stat-card border-0 shadow-lg shadow-primary/5 transition hover:-translate-y-0.5 hover:shadow-xl"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <CardContent className="p-6 text-center md:p-7">
              <p className="text-3xl font-black text-primary md:text-4xl">
                <StatValue>{item.value}</StatValue>
              </p>
              <p className="mt-2 text-base font-bold text-text">{item.label}</p>
              <p className="mt-1 text-sm text-text-muted">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
