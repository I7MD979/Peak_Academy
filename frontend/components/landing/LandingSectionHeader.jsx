import LandingReveal from "@/components/landing/LandingReveal";
import { cn } from "@/lib/utils";

export default function LandingSectionHeader({
  tag,
  title,
  subtitle,
  align = "start",
  theme = "light",
  className = ""
}) {
  const isCenter = align === "center";
  const isLight = theme === "light";

  return (
    <LandingReveal className={cn("mb-10 md:mb-12", className)}>
      <div
        className={cn(
          "w-full",
          isCenter && "mx-auto flex max-w-3xl flex-col items-center text-center"
        )}
      >
        {tag ? (
          <span className="landing-section-tag mb-4 inline-block">{tag}</span>
        ) : null}
        <h2
          className={cn(
            "landing-section-title w-full",
            isLight ? "text-primary" : "text-white",
            isCenter && "text-center"
          )}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            className={cn(
              "landing-section-sub mt-3 w-full max-w-2xl leading-relaxed",
              isLight ? "text-text-muted" : "text-[var(--landing-muted)]",
              isCenter && "text-center"
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </LandingReveal>
  );
}
