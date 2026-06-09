import { cn } from "@/lib/utils";
import PeakLogo from "@/components/shared/PeakLogo";

export default function AuthFormCard({ title, subtitle, children, footer, className, showLogo = false }) {
  return (
    <div className={cn("relative w-full max-w-[min(100%,28rem)] sm:max-w-[30rem]", className)}>
      <div className="pointer-events-none absolute -right-8 -top-8 hidden h-20 w-20 rounded-full bg-md-primary/10 blur-3xl sm:block" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 hidden h-24 w-24 rounded-full bg-tertiary/10 blur-3xl sm:block" />

      <div className="auth-form-card relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low p-6 sm:p-8 md:p-9">
        <div className="absolute right-0 top-0 h-1 w-20 rounded-bl-full bg-primary-container" />

        {showLogo ? (
          <div className="mb-6 flex justify-center sm:mb-7">
            <PeakLogo variant="compact" showSubtitle={false} className="items-center" />
          </div>
        ) : null}

        <div className="mb-6 text-center sm:mb-7">
          <h1 className="mb-2 text-2xl font-bold text-on-surface sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="text-sm leading-relaxed text-on-surface-variant">{subtitle}</p>
          ) : null}
        </div>

        {children}

        {footer ? <div className="mt-8 border-t border-outline-variant/60 pt-6 text-center">{footer}</div> : null}
      </div>
    </div>
  );
}
