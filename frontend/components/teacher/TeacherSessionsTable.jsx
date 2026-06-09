"use client";

import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import TeacherSessionRowActions from "@/components/teacher/TeacherSessionRowActions";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import { getEnrollmentCount, getSubjectLabel } from "@/lib/teacher-sessions";
import { cn } from "@/lib/utils";

export default function TeacherSessionsTable({
  sessions = [],
  loading = false,
  actionId = "",
  onDetails,
  onStart,
  onEnd,
  onCancel,
  onJoin
}) {
  const columns = [
    {
      key: "title",
      label: "الجلسة",
      render: (row) => (
        <div className="min-w-[180px]">
          <p className="font-bold text-auth-on-surface">{row.title}</p>
          <p className="mt-0.5 text-xs text-auth-on-surface-variant">{getSubjectLabel(row)}</p>
        </div>
      )
    },
    {
      key: "scheduled_at",
      label: "الموعد",
      render: (row) => formatDateTimeAr(row.scheduled_at)
    },
    {
      key: "students",
      label: "الطلاب",
      render: (row) => {
        const enrolled = getEnrollmentCount(row);
        const max = row.max_students || 0;
        const full = max > 0 && enrolled >= max;
        return (
          <span className={cn("font-bold", full ? "text-danger" : "text-auth-on-surface")}>
            {enrolled.toLocaleString("ar-EG")}/{max ? max.toLocaleString("ar-EG") : "—"}
          </span>
        );
      }
    },
    {
      key: "price",
      label: "السعر",
      render: (row) => <span className="font-bold text-peak-orange">{formatCurrencyEgp(row.price_per_student ?? 80)}</span>
    },
    {
      key: "status",
      label: "الحالة",
      render: (row) => <StatusBadge status={row.status} variant="session" />
    },
    {
      key: "actions",
      label: "الإجراءات",
      render: (row) => (
        <TeacherSessionRowActions
          session={row}
          actionId={actionId}
          onDetails={onDetails}
          onStart={onStart}
          onEnd={onEnd}
          onCancel={onCancel}
          onJoin={onJoin}
        />
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={sessions.map((row) => ({ ...row, _key: row.id }))}
      loading={loading}
      emptyMessage="لا توجد جلسات مطابقة"
      emptyDescription="جرّب تغيير الفلتر أو أنشئ جلسة جديدة."
      variant="dark"
      getRowClassName={(row) =>
        row.status === "live" ? "border-r-4 border-r-success bg-success/5" : ""
      }
    />
  );
}
