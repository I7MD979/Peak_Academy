import Icon from "@/components/shared/Icon";
import LandingReveal from "@/components/landing/LandingReveal";
import LandingSectionHeader from "@/components/landing/LandingSectionHeader";
import { landingSteps } from "@/lib/landing-content";
import { cn } from "@/lib/utils";

function StepBadge({ badge, variant }) {
  if (!badge) return null;
  return (
    <span
      className={cn(
        "mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold",
        variant === "free"
          ? "bg-success/15 text-success"
          : "bg-accent/15 text-accent"
      )}
    >
      {badge}
    </span>
  );
}

export default function LandingHowItWorks() {
  return (
    <section id="how" className="landing-section scroll-mt-20 bg-white px-4 md:px-8">
      <LandingSectionHeader
        theme="light"
        align="center"
        tag="كيف تبدأ"
        title="من التسجيل إلى أول حصة لايف"
        subtitle="أربع خطوات بسيطة — بدون تعقيد وبدون بطاقة في البداية."
      />

      <ol className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {landingSteps.map((item, index) => (
          <LandingReveal key={item.step} delay={index * 80}>
            <li className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 text-center shadow-sm transition hover:border-accent/30 hover:shadow-md">
              <span
                className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-black text-white shadow-lg shadow-accent/25"
                aria-hidden="true"
              >
                {item.step}
              </span>
              <h3 className="text-base font-bold text-primary md:text-lg">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{item.description}</p>
              <StepBadge badge={item.badge} variant={item.badgeVariant} />
            </li>
          </LandingReveal>
        ))}
      </ol>

      <LandingReveal className="mt-8 text-center" delay={200}>
        <p className="inline-flex items-center gap-2 text-sm text-text-muted">
          <Icon name="check" size={16} className="text-success" />
          كل خطوة موضّحة داخل لوحتك بعد التسجيل
        </p>
      </LandingReveal>
    </section>
  );
}
