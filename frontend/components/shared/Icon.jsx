"use client";

import { resolveIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export default function Icon({ name, className, size = 18, strokeWidth = 2, ...props }) {
  const LucideIcon = resolveIcon(name);
  return (
    <LucideIcon
      className={cn("shrink-0", className)}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    />
  );
}
