"use client";

import Link from "next/link";
import DataTable from "@/components/admin/DataTable";
import { teacherCardSolid, teacherSectionTitle } from "@/lib/teacher-styles";
import { formatDateTimeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function TeacherDashboardCompletedTable({ sessions = [], loading = false }) {
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
      key: "enrollment_count",
      label: "الطلاب",
      render: (row) => (row.enrollment_count ?? 0).toLocaleString("ar-EG")
    }
  ];

  return (
    <section className={cn(teacherCardSolid, "p-4 md:p-5")}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className={teacherSectionTitle}>آخر الجلسات المكتملة</h3>
        <Link href="/teacher/sessions" className="text-sm font-bold text-peak-orange hover:underline">
          عرض المكتملة
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={sessions.map((row) => ({ ...row, _key: `done-${row.id}` }))}
        loading={loading}
        emptyMessage="لا توجد جلسات مكتملة بعد"
        emptyDescription="بعد إنهاء جلساتك ستظهر هنا للمراجعة."
        variant="dark"
      />
    </section>
  );
}
