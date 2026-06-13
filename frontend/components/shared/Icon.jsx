"use client";

import { createElement, useMemo } from "react";
import { resolveIcon } from "@/lib/icons";
import { iconSizes, iconStroke } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const VARIANTS = {
  xs: { size: iconSizes.xs, strokeWidth: iconStroke.default },
  sm: { size: iconSizes.sm, strokeWidth: iconStroke.default },
  md: { size: iconSizes.md, strokeWidth: iconStroke.default },
  lg: { size: iconSizes.lg, strokeWidth: iconStroke.default },
  xl: { size: iconSizes.xl, strokeWidth: iconStroke.emphasis }
};

export default function Icon({
  name,
  className,
  variant,
  size,
  strokeWidth,
  ...props
}) {
  const resolved = VARIANTS[variant] || {};
  const LucideIcon = useMemo(() => resolveIcon(name), [name]);

  return createElement(LucideIcon, {
    className: cn("shrink-0", className),
    size: size ?? resolved.size ?? iconSizes.md,
    strokeWidth: strokeWidth ?? resolved.strokeWidth ?? iconStroke.default,
    "aria-hidden": props["aria-label"] ? undefined : true,
    ...props
  });
}

export { VARIANTS as iconVariants };
