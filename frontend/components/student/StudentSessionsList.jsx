"use client";

import AdminPagination from "@/components/admin/AdminPagination";
import SessionCard from "@/components/sessions/SessionCard";
import EmptyState from "@/components/shared/EmptyState";
import { SessionsListSkeleton } from "@/components/shared/LoadingSkeleton";

export default function StudentSessionsList({
  sessions = [],
  loading = false,
  page = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  emptyTitle = "",
  emptyHint = "",
  showEnroll = false
}) {
  if (loading) {
    return <SessionsListSkeleton />;
  }

  if (!sessions.length) {
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} showEnroll={showEnroll} />
        ))}
      </div>

      {totalPages > 1 ? (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalLabel={`${totalCount.toLocaleString("ar-EG")} جلسة`}
          loading={loading}
          onPrev={() => onPageChange?.(page - 1)}
          onNext={() => onPageChange?.(page + 1)}
        />
      ) : null}
    </section>
  );
}
