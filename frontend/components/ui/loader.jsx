import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "h-3.5 w-3.5 border-2",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-[2.5px]",
  lg: "h-8 w-8 border-[3px]",
  xl: "h-11 w-11 border-[3px]"
};

const VARIANT_CLASSES = {
  default: "border-outline-variant/25 border-t-peak-orange",
  light: "border-black/10 border-t-peak-orange",
  onPrimary: "border-white/30 border-t-white",
  muted: "border-auth-outline-variant/30 border-t-auth-primary-container"
};

/**
 * Unified Peak Academy loading spinner.
 */
export function LoadingSpinner({
  size = "md",
  variant = "default",
  glow = false,
  className,
  label = "جاري التحميل"
}) {
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {glow ? (
        <span
          className={cn(
            "absolute inset-0 rounded-full bg-peak-orange/25 blur-md",
            "animate-peak-loader-glow"
          )}
          aria-hidden
        />
      ) : null}
      <span
        className={cn(
          "relative block rounded-full animate-spin",
          SIZE_CLASSES[size] || SIZE_CLASSES.md,
          VARIANT_CLASSES[variant] || VARIANT_CLASSES.default
        )}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Spinner + message row — chat panels, tables, modals.
 */
export function InlineLoader({
  message = "جاري التحميل...",
  size = "sm",
  variant = "default",
  className,
  vertical = false
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2.5",
        vertical && "flex-col gap-3",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size={size} variant={variant} label={message} glow={vertical} />
      {message ? (
        <p className="text-sm font-medium text-on-surface-variant">{message}</p>
      ) : null}
    </div>
  );
}

/**
 * Compact spinner for buttons — pass as child while submitting.
 */
export function ButtonLoader({ size = "sm", variant = "onPrimary", className }) {
  return <LoadingSpinner size={size} variant={variant} className={className} label="جاري المعالجة" />;
}
