"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_DARK = "/brand/peak-academy-logo-dark.png";

const VARIANTS = {
  full: { width: 180, height: 72, imgClass: "h-14 w-auto max-h-14 max-w-[180px] sm:h-16 sm:max-h-16 sm:max-w-[200px]" },
  sidebar: { width: 160, height: 48, imgClass: "h-10 w-auto max-h-10 max-w-[160px]" },
  compact: { width: 120, height: 40, imgClass: "h-9 w-auto max-h-9 max-w-[120px]" },
  header: { width: 110, height: 36, imgClass: "h-8 w-auto max-h-8 max-w-[110px] sm:h-9 sm:max-h-9 sm:max-w-[120px]" }
};

export default function PeakLogo({
  className,
  imageClassName,
  href,
  onClick,
  subtitle,
  variant = "sidebar",
  priority = false,
  showSubtitle = true,
  theme = "dark"
}) {
  const size = VARIANTS[variant] || VARIANTS.sidebar;
  const subtitleTone =
    theme === "dark" ? "text-on-surface-variant" : "text-text-muted";

  const logoImage = (
    <Image
      src={LOGO_DARK}
      alt="Peak Academy — أكاديمية الذروة"
      width={size.width}
      height={size.height}
      priority={priority}
      className={cn(size.imgClass, "object-contain object-start", imageClassName)}
    />
  );

  const content = (
    <div className={cn("inline-flex min-w-0 flex-col gap-1.5", className)}>
      {logoImage}
      {subtitle && showSubtitle ? (
        <p className={cn("text-xs font-medium leading-snug", subtitleTone)}>{subtitle}</p>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex min-w-0 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {content}
      </Link>
    );
  }

  return content;
}
