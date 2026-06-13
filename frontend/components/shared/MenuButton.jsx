"use client";

import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

export default function MenuButton({ onClick, className, label = "فتح القائمة", icon = "menu", variant = "surface" }) {
  const isSurface = variant === "surface";

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-10 w-10 rounded-xl p-0",
        isSurface
          ? "border-outline-variant/60 bg-surface-container-high text-on-surface hover:border-primary-container/40 hover:text-md-primary"
          : "border-outline-variant/40 bg-surface-container text-on-surface",
        className
      )}
      onClick={onClick}
      aria-label={label}
    >
      <Icon name={icon} size={20} />
    </Button>
  );
}
