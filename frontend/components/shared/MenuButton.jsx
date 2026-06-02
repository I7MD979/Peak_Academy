"use client";

import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

export default function MenuButton({ onClick, className, label = "فتح القائمة", icon = "menu" }) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("h-10 w-10 rounded-xl border-border bg-card p-0", className)}
      onClick={onClick}
      aria-label={label}
    >
      <Icon name={icon} size={20} className="text-primary" />
    </Button>
  );
}
