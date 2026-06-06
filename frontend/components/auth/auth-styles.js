import { cn } from "@/lib/utils";

/** Shared dark MD3 auth field styles (matches login / reset-password). */
export const authInputClass = cn(
  "w-full min-h-[3rem] rounded-lg border border-outline-variant bg-surface-container-highest px-4 py-2.5 text-sm text-on-surface",
  "placeholder:text-on-surface-variant/40 transition-all",
  "focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

export const authSelectClass = cn(authInputClass, "text-start");

export const authLabelClass = "block text-xs font-semibold text-on-surface-variant";

export const authBtnPrimaryClass = cn(
  "flex w-full min-h-[3rem] items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-3",
  "text-base font-bold text-on-primary-container shadow-lg shadow-primary-container/20 sm:text-lg",
  "transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
);

export const authBtnGoogleClass = cn(
  "flex w-full min-h-[3rem] items-center justify-center gap-3 rounded-lg border border-outline-variant",
  "bg-surface-container-highest px-4 py-3 text-sm font-medium text-on-surface",
  "transition-all hover:bg-surface-container-highest/80 disabled:cursor-not-allowed disabled:opacity-60"
);

export const authErrorClass =
  "rounded-lg border border-error/30 bg-error-container/20 p-3 text-center text-sm text-error";

export const authDividerClass = "flex-grow border-t border-outline-variant";

export const authStepActiveClass = "border-primary-container bg-primary-container/10";
export const authStepDoneClass = "border-success/40 bg-success/10";
export const authStepIdleClass = "border-outline-variant bg-surface-container";
