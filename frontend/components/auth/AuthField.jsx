import { cn } from "@/lib/utils";
import { authLabelClass } from "@/components/auth/auth-styles";

export default function AuthField({ id, label, hint, error, children, className, variant = "dark" }) {
  const isDark = variant === "dark";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-semibold",
            isDark ? authLabelClass : "font-bold text-text"
          )}
        >
          {label}
        </label>
        {hint ? (
          <span className={cn("text-xs", isDark ? "text-on-surface-variant" : "text-text-muted")}>
            {hint}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className={cn("text-xs font-semibold", isDark ? "text-error" : "text-danger")}>{error}</p>
      ) : null}
    </div>
  );
}

export { authInputClass } from "@/components/auth/auth-styles";
