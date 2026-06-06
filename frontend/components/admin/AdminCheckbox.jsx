"use client";

import { cn } from "@/lib/utils";

export default function AdminCheckbox({ checked, onChange, label, id, disabled, className }) {
  const inputId = id || label;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border border-auth-outline-variant/30 bg-auth-surface-low px-3 py-2.5 transition-colors hover:border-peak-orange/30",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
        />
        <span className="h-5 w-5 rounded-md border border-auth-outline-variant/50 bg-auth-surface-highest transition-all peer-checked:border-peak-orange peer-checked:bg-peak-orange peer-focus-visible:ring-2 peer-focus-visible:ring-peak-orange/40" />
        <span className="pointer-events-none absolute text-[11px] font-black text-white opacity-0 transition-opacity peer-checked:opacity-100">
          ✓
        </span>
      </span>
      {label ? <span className="text-sm font-semibold text-auth-on-surface">{label}</span> : null}
    </label>
  );
}
