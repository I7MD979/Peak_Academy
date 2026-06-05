import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-5 shadow-sm">
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

export function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-primary" />
          <div className="h-5 w-28 animate-pulse rounded bg-border" />
        </div>
        <div className="mt-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
        <p className="animate-pulse text-sm text-text-muted">جاري التحميل...</p>
      </div>
    </div>
  );
}

export function SectionLoader({ message = "جاري التحميل..." }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-border border-t-primary" />
      <p className="text-sm text-text-muted">{message}</p>
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
          className="flex animate-pulse items-center gap-4 rounded-2xl border border-border bg-card p-4"
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
