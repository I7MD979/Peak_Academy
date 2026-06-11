import { Skeleton } from "@/components/ui/skeleton";
import { ButtonLoader, InlineLoader, LoadingSpinner } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

export { LoadingSpinner, InlineLoader, ButtonLoader } from "@/components/ui/loader";

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-outline-variant/40 bg-surface-container-low p-5">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-32 rounded" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function PageLoader({ message = "جاري التحميل...", className }) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container/15 text-lg font-black text-primary-container">
            P
          </span>
          <span className="text-base font-black tracking-tight text-on-surface">Peak Academy</span>
        </div>
        <LoadingSpinner size="xl" glow label={message} />
        <div className="text-center">
          <p className="text-sm font-semibold text-on-surface">{message}</p>
          <p className="mt-1 text-xs text-on-surface-variant">من فضلك انتظر قليلاً</p>
        </div>
      </div>
    </div>
  );
}

export function SectionLoader({
  message = "جاري التحميل...",
  className,
  minHeight = "min-h-[200px]"
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", minHeight, className)}
      role="status"
      aria-live="polite"
    >
      <InlineLoader message={message} size="md" vertical />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
      <TableSkeleton rows={4} />
    </div>
  );
}

export function SessionsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-4 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4"
        >
          <Skeleton className="h-12 w-12 flex-shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
