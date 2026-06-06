import { cn } from "@/lib/utils";

const ARABIC_NUMERALS = ["١", "٢", "٣"];

export default function AuthStepIndicator({ steps, currentStep, className }) {
  return (
    <nav aria-label="خطوات التسجيل" className={cn("mb-1 flex items-start justify-between gap-1", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const active = currentStep === stepNumber;
        const done = currentStep > stepNumber;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center">
            <div
              className={cn(
                "flex min-w-0 flex-col items-center gap-1.5 transition-opacity sm:gap-2",
                !active && !done && "opacity-50"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all sm:h-10 sm:w-10",
                  active &&
                    "bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/25",
                  done && "bg-success text-white",
                  !active && !done && "border-2 border-outline-variant text-on-surface-variant"
                )}
              >
                {done ? "✓" : ARABIC_NUMERALS[index] || stepNumber}
              </div>
              <span
                className={cn(
                  "w-full max-w-[5rem] text-center text-[10px] font-bold leading-tight sm:max-w-[6.5rem] sm:text-[11px]",
                  active || done ? "text-md-primary" : "text-on-surface-variant"
                )}
              >
                {step.title}
              </span>
            </div>

            {!isLast ? (
              <div
                className={cn(
                  "mx-1 mb-6 h-0.5 min-w-[0.75rem] flex-1 sm:mx-2 sm:mb-5",
                  done ? "bg-success/60" : "bg-outline-variant"
                )}
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
