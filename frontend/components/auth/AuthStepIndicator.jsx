import { Fragment } from "react";
import { cn } from "@/lib/utils";

const ARABIC_NUMERALS = ["١", "٢", "٣"];

export default function AuthStepIndicator({ steps, currentStep, className }) {
  return (
    <nav aria-label="خطوات التسجيل" className={cn("mb-1 flex justify-center", className)}>
      <div className="inline-flex items-start">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const active = currentStep === stepNumber;
          const done = currentStep > stepNumber;
          const isLast = index === steps.length - 1;

          return (
            <Fragment key={step.id}>
              <div
                className={cn(
                  "flex w-[5.5rem] flex-col items-center gap-1.5 transition-opacity sm:w-[7rem] sm:gap-2",
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
                    "w-full text-center text-[10px] font-bold leading-tight sm:text-[11px]",
                    active || done ? "text-md-primary" : "text-on-surface-variant"
                  )}
                >
                  {step.title}
                </span>
              </div>

              {!isLast ? (
                <div
                  className={cn(
                    "mt-[1.125rem] h-0.5 w-14 shrink-0 sm:mt-5 sm:w-20",
                    done ? "bg-success/60" : "bg-outline-variant"
                  )}
                />
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
