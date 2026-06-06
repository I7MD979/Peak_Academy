"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminReportDetailsModal from "@/components/admin/AdminReportDetailsModal";
import AdminReportsView, { RankBadge } from "@/components/admin/AdminReportsPage";
import { dashboardApi } from "@/lib/api";
import { formatCurrencyEgp } from "@/lib/format";

function buildCsv(report, periodLabel) {
  const lines = [`تقرير Peak Academy — ${periodLabel}`, ""];

  lines.push("الملخص");
  lines.push(`إيرادات المنصة,${report?.summary?.platform_revenue ?? 0}`);
  lines.push(`المسحوبات المدفوعة,${report?.summary?.total_withdrawn ?? 0}`);
  lines.push(`طلاب جدد,${report?.summary?.new_students ?? 0}`);
  lines.push(`جلسات مكتملة,${report?.summary?.completed_sessions ?? 0}`);
  lines.push(`متوسط التقييم,${report?.summary?.avg_rating ?? 0}`);
  lines.push("");

  lines.push("أفضل المدرسين");
  lines.push("الترتيب,المدرس,المادة,الجلسات,إجمالي الأرباح");
  for (const row of report?.top_teachers || []) {
    lines.push(
      [row.rank, row.teacher_name, row.subject, row.sessions_count, row.total_earnings].join(",")
    );
  }
  lines.push("");

  lines.push("أفضل المواد");
  lines.push("الترتيب,المادة,الجلسات,الطلاب");
  for (const row of report?.top_subjects || []) {
    lines.push([row.rank, row.subject, row.sessions_count, row.students_count].join(","));
  }

  return `\uFEFF${lines.join("\n")}`;
}

export default function AdminReportsRoute() {
  const [period, setPeriod] = useState("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStat, setActiveStat] = useState("");
  const [detailsItem, setDetailsItem] = useState(null);
  const [detailsType, setDetailsType] = useState("teacher");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = { period };
      if (dateFrom) query.from = dateFrom;
      if (dateTo) query.to = dateTo;

      const res = await dashboardApi.adminReports(query);
      setReport(res?.data || null);
    } catch (err) {
      setReport(null);
      setError(err.message || "تعذر تحميل التقارير. تأكد أن الخادم يعمل.");
    } finally {
      setLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const summary = report?.summary;
  const monthlyRevenue = report?.monthly_revenue || [];
  const topTeachers = report?.top_teachers || [];
  const topSubjects = report?.top_subjects || [];
  const periodLabel = report?.period_label || "هذا الشهر";

  const openDetails = (item, type) => {
    setDetailsItem(item);
    setDetailsType(type);
  };

  const handleStatFocus = (_key, sectionId) => {
    setActiveStat(_key);
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleExportPdf = () => {
    toast.info("تصدير PDF سيتوفر قريباً");
  };

  const handleExportCsv = () => {
    if (!report) return;
    const blob = new Blob([buildCsv(report, periodLabel)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `peak-reports-${report.period || period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير التقرير بصيغة CSV");
  };

  const teacherColumns = useMemo(
    () => [
      {
        key: "rank",
        label: "#",
        render: (row) => <RankBadge rank={row.rank} />
      },
      {
        key: "teacher_name",
        label: "المدرس",
        render: (row) => <span className="font-semibold text-on-surface">{row.teacher_name}</span>
      },
      { key: "subject", label: "المادة" },
      {
        key: "sessions_count",
        label: "الجلسات",
        render: (row) => <span>{row.sessions_count.toLocaleString("ar-EG")}</span>
      },
      {
        key: "total_earnings",
        label: "إجمالي الأرباح",
        render: (row) => (
          <span className="font-bold text-success">{formatCurrencyEgp(row.total_earnings)}</span>
        )
      },
      {
        key: "actions",
        label: "",
        render: (row) => (
          <AdminActionsMenu
            items={[
              {
                label: "عرض التفاصيل",
                icon: "visibility",
                onClick: () => openDetails(row, "teacher")
              }
            ]}
          />
        )
      }
    ],
    []
  );

  const subjectColumns = useMemo(
    () => [
      {
        key: "rank",
        label: "#",
        render: (row) => <RankBadge rank={row.rank} />
      },
      {
        key: "subject",
        label: "المادة",
        render: (row) => <span className="font-semibold text-on-surface">{row.subject}</span>
      },
      {
        key: "sessions_count",
        label: "الجلسات",
        render: (row) => <span>{row.sessions_count.toLocaleString("ar-EG")}</span>
      },
      {
        key: "students_count",
        label: "الطلاب",
        render: (row) => (
          <span className="font-bold text-accent-blue">{row.students_count.toLocaleString("ar-EG")}</span>
        )
      },
      {
        key: "actions",
        label: "",
        render: (row) => (
          <AdminActionsMenu
            items={[
              {
                label: "عرض التفاصيل",
                icon: "visibility",
                onClick: () => openDetails(row, "subject")
              }
            ]}
          />
        )
      }
    ],
    []
  );

  return (
    <>
      <AdminReportsView
        loading={loading}
        error={error}
        period={period}
        onPeriodChange={setPeriod}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onClearDates={() => {
          setDateFrom("");
          setDateTo("");
        }}
        periodLabel={periodLabel}
        summary={summary}
        monthlyRevenue={monthlyRevenue}
        topTeachers={topTeachers}
        topSubjects={topSubjects}
        teacherColumns={teacherColumns}
        subjectColumns={subjectColumns}
        activeStat={activeStat}
        onStatFocus={handleStatFocus}
        onRefresh={loadReports}
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
      />

      <AdminReportDetailsModal
        open={Boolean(detailsItem)}
        item={detailsItem}
        type={detailsType}
        periodLabel={periodLabel}
        onClose={() => setDetailsItem(null)}
      />
    </>
  );
}
