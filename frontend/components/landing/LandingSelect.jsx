"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function LandingSelect({ value, onChange, options, className, "aria-label": ariaLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative w-full max-w-xs", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-landing-orange/40 focus:outline-none focus:ring-2 focus:ring-landing-orange/30"
      >
        <span>{selected?.label}</span>
        <span className={cn("material-symbols-outlined text-lg text-landing-on-dark-subtle transition-transform", open && "rotate-180")}>
          expand_more
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-white/10 bg-landing-navy-card py-1 shadow-2xl shadow-black/40"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors",
                    active ? "bg-landing-orange/15 text-landing-orange" : "text-landing-on-dark-muted hover:bg-white/5 hover:text-white"
                  )}
                >
                  {option.label}
                  {active ? <span className="material-symbols-outlined text-base">check</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
