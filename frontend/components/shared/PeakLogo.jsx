"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_DARK = "/brand/peak-academy-logo-dark.png";
const LOGO_HORIZONTAL_SVG = "/brand/peak_academy_logo_english_only_side_by_side.svg";

const VARIANTS = {
  full: {
    width: 400,
    height: 120,
    imgClass: "h-16 w-auto max-h-16 max-w-[280px] sm:h-20 sm:max-h-20 sm:max-w-[340px]"
  },
  sidebar: {
    width: 168,
    height: 52,
    imgClass: "h-11 w-auto max-h-11 max-w-[168px]"
  },
  compact: {
    width: 240,
    height: 72,
    imgClass: "h-12 w-auto max-h-12 max-w-[200px] sm:h-14 sm:max-h-14 sm:max-w-[220px]"
  },
  header: {
    width: 280,
    height: 88,
    imgClass: "h-14 w-auto max-h-14 max-w-[240px] sm:h-16 sm:max-h-16 sm:max-w-[280px]"
  },
  landing: {
    width: 360,
    height: 120,
    imgClass: "h-16 w-auto max-h-16 max-w-[280px] sm:h-[4.5rem] sm:max-h-[4.5rem] sm:max-w-[320px] md:h-20 md:max-h-20 md:max-w-[360px]"
  }
};

const HORIZONTAL_SIZES = {
  landing: "h-11 w-auto sm:h-12 md:h-[3.25rem]",
  full: "h-12 w-auto sm:h-14",
  compact: "h-10 w-auto sm:h-11",
  header: "h-11 w-auto sm:h-12",
  sidebar: "h-10 w-auto"
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
  showWordmark = false,
  theme = "dark"
}) {
  const size = VARIANTS[variant] || VARIANTS.sidebar;
  const subtitleTone = theme === "dark" ? "text-on-surface-variant" : "text-text-muted";
  const horizontalClass = HORIZONTAL_SIZES[variant] || HORIZONTAL_SIZES.landing;

  const logoImage = showWordmark ? (
    <Image
      src={LOGO_HORIZONTAL_SVG}
      alt="Peak Academy"
      width={880}
      height={360}
      priority={priority}
      unoptimized
      className={cn(horizontalClass, "object-contain object-start", imageClassName)}
    />
  ) : (
    <Image
      src={LOGO_DARK}
      alt="Peak Academy"
      width={size.width}
      height={size.height}
      priority={priority}
      className={cn(size.imgClass, "object-contain object-start", imageClassName)}
    />
  );

  const content = (
    <div className={cn("inline-flex min-w-0 flex-col gap-1.5", className)}>
      {logoImage}
      {!showWordmark && subtitle && showSubtitle ? (
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
        aria-label="Peak Academy"
      >
        {content}
      </Link>
    );
  }

  return content;
}
