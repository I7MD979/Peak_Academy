"use client";

import AdminPagination from "@/components/admin/AdminPagination";
import TeacherSessionCard from "@/components/teacher/TeacherSessionCard";
import TeacherSessionsTable from "@/components/teacher/TeacherSessionsTable";
import EmptyState from "@/components/shared/EmptyState";
import { SessionsListSkeleton } from "@/components/shared/LoadingSkeleton";

export default function TeacherSessionsList({
  sessions = [],
  loading = false,
  page = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  emptyTitle = "",
  emptyHint = "",
  actionId = "",
  onDetails,
  onStart,
  onEnd,
  onCancel,
  onJoin,
  verificationStatus
}) {
  if (loading) {
    return <SessionsListSkeleton />;
  }

  if (!sessions.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyHint}
        action={{ label: "إنشاء جلسة جديدة", href: "/teacher/sessions/new" }}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:hidden">
        {sessions.map((session) => (
          <TeacherSessionCard
            key={session.id}
            session={session}
            actionId={actionId}
            onDetails={onDetails}
            onStart={onStart}
            onEnd={onEnd}
            onCancel={onCancel}
            onJoin={onJoin}
            verificationStatus={verificationStatus}
          />
        ))}
      </div>

      <div className="hidden md:block">
        <TeacherSessionsTable
          sessions={sessions}
          loading={false}
          actionId={actionId}
          onDetails={onDetails}
          onStart={onStart}
          onEnd={onEnd}
          onCancel={onCancel}
          onJoin={onJoin}
          verificationStatus={verificationStatus}
        />
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
