"use client";

import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

export default function NavIcon({ name, active = false, variant = "sidebar" }) {
  if (variant === "bottom") {
    return (
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
          active ? "bg-accent/15 text-accent scale-105" : "text-text-muted"
        )}
      >
        <Icon name={name} size={20} strokeWidth={active ? 2.25 : 2} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
        active ? "bg-accent/20 text-accent" : "bg-white/5 text-white/75 group-hover:text-white"
      )}
    >
      <Icon name={name} size={18} strokeWidth={active ? 2.25 : 2} />
    </span>
  );
}
