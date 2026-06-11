"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Official horizontal wordmark — transparent background (SVG). */
const LOGO_SRC = "/brand/peak_academy_logo_english_only_side_by_side.svg";

const HORIZONTAL_SIZES = {
  landing: "h-11 w-auto sm:h-12 md:h-[3.25rem]",
  full: "h-12 w-auto sm:h-14",
  compact: "h-10 w-auto sm:h-11",
  header: "h-11 w-auto sm:h-12",
  sidebar: "h-10 w-auto max-w-[168px]"
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
  const horizontalClass = HORIZONTAL_SIZES[variant] || HORIZONTAL_SIZES.sidebar;
  const subtitleTone = theme === "dark" ? "text-on-surface-variant" : "text-text-muted";
  const lightShell =
    theme === "light" ? "inline-flex rounded-lg bg-landing-navy px-2.5 py-1.5 shadow-sm" : "inline-flex";

  const logoImage = (
    <Image
      src={LOGO_SRC}
      alt="Peak Academy"
      width={880}
      height={360}
      priority={priority}
      unoptimized
      className={cn(horizontalClass, "object-contain object-start", imageClassName)}
    />
  );

  const content = (
    <div className={cn("inline-flex min-w-0 flex-col gap-1.5", className)}>
      <div className={lightShell}>{logoImage}</div>
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
        aria-label="Peak Academy"
      >
        {content}
      </Link>
    );
  }

  return content;
}
