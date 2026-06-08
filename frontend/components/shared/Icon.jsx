"use client";

import { createElement, useMemo } from "react";
import { resolveIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export default function Icon({ name, className, size = 18, strokeWidth = 2, ...props }) {
  const LucideIcon = useMemo(() => resolveIcon(name), [name]);
  return createElement(LucideIcon, {
    className: cn("shrink-0", className),
    size,
    strokeWidth,
    "aria-hidden": props["aria-label"] ? undefined : true,
    ...props
  });
}
