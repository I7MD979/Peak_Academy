"use client";

import { PAGE_CONTAINER, PAGE_CONTAINER_COMPACT } from "@/lib/page-layout";
import { cn } from "@/lib/utils";

export default function PageContainer({ children, className, compact = false }) {
  return (
    <div className={cn(compact ? PAGE_CONTAINER_COMPACT : PAGE_CONTAINER, className)}>
      {children}
    </div>
  );
}
