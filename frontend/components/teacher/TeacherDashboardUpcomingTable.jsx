"use client";

import Link from "next/link";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { teacherBtnPrimary, teacherBtnSecondary, teacherCardSolid, teacherSectionTitle } from "@/lib/teacher-styles";
import { formatDateTimeAr } from "@/lib/format";
import { getStartAvailability } from "@/lib/teacher-sessions";
import { cn } from "@/lib/utils";

export default function TeacherDashboardUpcomingTable({
  sessions = [],
  loading = false,
  actionLoadingId = "",
  onStartSession,
  onEndSession
}) {
  const columns = [
    {
      key: "title",
      label: "الجلسة",
      render: (row) => (
        <Link
          href={`/teacher/sessions/${row.id}`}
          className="font-semibold text-auth-on-surface hover:text-peak-orange hover:underline"
        >
          {row.title || "جلسة بدون عنوان"}
        </Link>
      )
    },
    {
      key: "scheduled_at",
      label: "الموعد",
      render: (row) => formatDateTimeAr(row.scheduled_at)
    },
    {
      key: "status",
      label: "الحالة",
      render: (row) => <StatusBadge status={row.status} variant="session" />
    },
    {
      key: "actions",
      label: "إجراء",
      render: (row) => {
        if (row.status === "live") {
          return (
            <div className="flex flex-wrap gap-2">
              <Link href={`/teacher/live/${row.id}`} className={cn(teacherBtnPrimary, "bg-danger px-4 py-2 text-xs")}>
                دخول البث
              </Link>
              <button
                type="button"
                disabled={actionLoadingId === `end-${row.id}`}
                onClick={() => onEndSession?.(row.id)}
                className={cn(teacherBtnSecondary, "border-danger/40 px-4 py-2 text-xs text-danger hover:bg-danger/10")}
              >
                {actionLoadingId === `end-${row.id}` ? "جارٍ..." : "إنهاء"}
              </button>
            </div>
          );
        }

        const startInfo = getStartAvailability(row);
        return (
          <button
            type="button"
            disabled={!startInfo.canStart || actionLoadingId === `start-${row.id}`}
            title={startInfo.reason || undefined}
            onClick={() => onStartSession?.(row.id)}
            className={cn(teacherBtnPrimary, "px-4 py-2 text-xs disabled:opacity-50")}
          >
            {actionLoadingId === `start-${row.id}` ? "جارٍ..." : "بدء الجلسة"}
          </button>
        );
      }
    }
  ];

  return (
    <section className={cn(teacherCardSolid, "p-4 md:p-5")}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className={teacherSectionTitle}>الجلسات القادمة</h3>
        <Link href="/teacher/sessions" className="text-sm font-bold text-peak-orange hover:underline">
          عرض كل الجلسات
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={sessions.map((row) => ({ ...row, _key: `upcoming-${row.id}` }))}
        loading={loading}
        emptyMessage="لا توجد جلسات قادمة"
        emptyDescription="أنشئ جلسة جديدة لتظهر هنا للمتابعة والبدء."
        variant="dark"
      />
    </section>
  );
}
