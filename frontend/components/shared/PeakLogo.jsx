"use client";

import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

export default function PeakLogo({
  className,
  iconClassName,
  showText = true,
  subtitle,
  theme = "dark"
}) {
  const isDark = theme === "dark";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm",
          isDark ? "bg-accent/20 text-accent" : "bg-primary/10 text-primary",
          iconClassName
        )}
      >
        <Icon name="mountain" size={22} strokeWidth={2.25} />
      </span>
      {showText ? (
        <div>
          <div
            className={cn(
              "text-sm font-black leading-tight",
              isDark ? "text-white" : "text-primary"
            )}
          >
            Peak Academy
          </div>
          {subtitle ? (
            <div className={cn("text-xs", isDark ? "text-white/70" : "text-text-muted")}>{subtitle}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
