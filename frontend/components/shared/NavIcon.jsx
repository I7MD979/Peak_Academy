"use client";

import Icon from "@/components/shared/Icon";
import { iconSizes, iconStroke } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function NavIcon({ name, active = false, variant = "sidebar" }) {
  if (variant === "surface") {
    return (
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-primary-container/20 text-md-primary"
            : "bg-surface-container-high text-on-surface-variant group-hover:text-on-surface"
        )}
      >
        <Icon
          name={name}
          size={iconSizes.md}
          strokeWidth={active ? iconStroke.emphasis : iconStroke.default}
        />
      </span>
    );
  }

  if (variant === "bottom") {
    return (
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
          active ? "bg-peak-orange/15 text-peak-orange scale-105" : "text-auth-on-surface-variant"
        )}
      >
        <Icon
          name={name}
          size={iconSizes.lg}
          strokeWidth={active ? iconStroke.emphasis : iconStroke.default}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
        active ? "bg-peak-orange/20 text-peak-orange" : "bg-auth-surface-highest text-auth-on-surface-variant group-hover:text-auth-on-surface"
      )}
    >
      <Icon
        name={name}
        size={iconSizes.md}
        strokeWidth={active ? iconStroke.emphasis : iconStroke.default}
      />
    </span>
  );
}
