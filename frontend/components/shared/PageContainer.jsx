"use client";

import { PAGE_CONTAINER } from "@/lib/page-layout";
import { cn } from "@/lib/utils";

export default function PageContainer({ children, className, compact = false }) {
  return (
    <div
      className={cn(
        compact ? "mx-auto max-w-6xl space-y-6 p-4 md:p-8" : PAGE_CONTAINER,
        className
      )}
    >
      {children}
    </div>
  );
}
