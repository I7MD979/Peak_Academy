"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const DateTimePicker = forwardRef(({ className, label, error, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <label className="text-sm font-medium text-text-muted">{label}</label> : null}
      <input
        ref={ref}
        type="datetime-local"
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm",
          "text-text placeholder:text-text-muted",
          "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[color-scheme:light] dark:[color-scheme:dark]",
          error && "border-danger focus:ring-danger",
          className
        )}
        {...props}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
});
DateTimePicker.displayName = "DateTimePicker";

const DatePicker = forwardRef(({ className, label, error, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <label className="text-sm font-medium text-text-muted">{label}</label> : null}
      <input
        ref={ref}
        type="date"
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm",
          "text-text placeholder:text-text-muted",
          "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[color-scheme:light] dark:[color-scheme:dark]",
          error && "border-danger focus:ring-danger",
          className
        )}
        {...props}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
});
DatePicker.displayName = "DatePicker";

export { DateTimePicker, DatePicker };
