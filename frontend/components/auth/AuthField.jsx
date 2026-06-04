import { cn } from "@/lib/utils";

export default function AuthField({
  id,
  label,
  hint,
  error,
  children,
  className
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold text-text">
          {label}
        </label>
        {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}

export const authInputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-text shadow-sm transition-colors placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60";
