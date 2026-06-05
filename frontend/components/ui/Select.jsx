"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Select = forwardRef(({ className, label, error, children, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <label className="text-sm font-medium text-text-muted">{label}</label> : null}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none rounded-lg border border-border bg-bg px-3 py-2 pl-8 text-sm",
            "text-text",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "cursor-pointer",
            error && "border-danger focus:ring-danger",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
          <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
});
Select.displayName = "Select";

export { Select };
