"use client";

import { useEffect, useId, useRef, useState } from "react";
import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

export default function AdminActionsMenu({ items, disabled = false, label = "إجراءات" }) {
  const id = useId();
  const menuId = `${id}-menu`;
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visibleItems = items.filter((item) => item.show !== false);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg border border-auth-outline-variant/50 bg-auth-surface-highest px-3 text-xs font-bold text-auth-on-surface transition-colors",
          "hover:border-peak-orange/40 hover:bg-auth-surface-low disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span>{label}</span>
        <Icon name="chevronDown" size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute end-0 z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-auth-outline-variant/40 bg-auth-surface-highest py-1 shadow-xl shadow-black/30"
        >
          {visibleItems.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm transition-colors",
                  item.tone === "danger" && "text-danger hover:bg-danger/10",
                  item.tone === "success" && "text-success hover:bg-success/10",
                  item.tone === "primary" && "text-peak-orange hover:bg-peak-orange/10",
                  !item.tone && "text-auth-on-surface hover:bg-auth-surface-low",
                  item.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                {item.icon ? <Icon name={item.icon} size={16} className="shrink-0 opacity-80" /> : null}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
