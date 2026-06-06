"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ParentReportView from "@/components/parent/ParentReportPage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { parentApi } from "@/lib/api";
import {
  patchParentReportUrl,
  readParentReportParam,
  resolveParentReportPeriod,
  resolveParentReportStudentId
} from "@/lib/parent-report";

function ParentReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlStudent = useMemo(() => readParentReportParam(searchParams, "student"), [searchParams]);
  const period = useMemo(() => resolveParentReportPeriod(searchParams), [searchParams]);
  const dateFrom = useMemo(() => readParentReportParam(searchParams, "from"), [searchParams]);
  const dateTo = useMemo(() => readParentReportParam(searchParams, "to"), [searchParams]);

  const [linkedChildren, setLinkedChildren] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState(null);
  const [linkCode, setLinkCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const syncUrl = useCallback(
    (patch) => {
      router.replace(patchParentReportUrl(searchParams, patch), { scroll: false });
    },
    [router, searchParams]
  );

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await parentApi.children();
      const list = res?.data?.children || [];
      setLinkedChildren(list);
      setSelectedId((current) =>
        resolveParentReportStudentId({ linkedChildren: list, urlStudent, currentId: current })
      );
    } catch (err) {
      setLinkedChildren([]);
      setError(err.message || "تعذر تحميل الأبناء المربوطين");
    } finally {
      setLoading(false);
    }
  }, [urlStudent]);

  const loadReport = useCallback(
    async (studentId, { silent = false } = {}) => {
      if (!studentId) {
        setReport(null);
        return;
      }
      if (period === "custom" && !dateFrom && !dateTo) {
        setReport(null);
        return;
      }

      if (silent) setRefreshing(true);
      else setReportLoading(true);

      try {
        const res = await parentApi.report(studentId, { period, from: dateFrom, to: dateTo });
        setReport(res?.data || null);
      } catch (err) {
        setReport(null);
        toast.error(err.message || "تعذر تحميل التقرير");
      } finally {
        setReportLoading(false);
        setRefreshing(false);
      }
    },
    [period, dateFrom, dateTo]
  );

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (!loading && selectedId && !urlStudent) {
      syncUrl({ student: selectedId });
    }
  }, [loading, selectedId, urlStudent, syncUrl]);

  useEffect(() => {
    if (urlStudent && linkedChildren.some((child) => child.id === urlStudent) && selectedId !== urlStudent) {
      setSelectedId(urlStudent);
    }
  }, [urlStudent, linkedChildren, selectedId]);

  useEffect(() => {
    if (selectedId) loadReport(selectedId);
  }, [selectedId, loadReport]);

  const handleStudentChange = (id) => {
    setSelectedId(id);
    syncUrl({ student: id });
  };

  const handlePeriodChange = (next) => {
    if (next === "custom") {
      syncUrl({ period: next, from: dateFrom, to: dateTo, student: selectedId });
    } else {
      syncUrl({ period: next, from: "", to: "", student: selectedId });
    }
  };

  const handleDateFromChange = (event) => {
    syncUrl({ period: "custom", from: event.target.value, to: dateTo, student: selectedId });
  };

  const handleDateToChange = (event) => {
    syncUrl({ period: "custom", from: dateFrom, to: event.target.value, student: selectedId });
  };

  const handleLink = async (event) => {
    event.preventDefault();
    const code = linkCode.trim().toUpperCase();
    if (!code) {
      toast.error("أدخل كود الربط");
      return;
    }

    setLinking(true);
    try {
      const res = await parentApi.linkStudent(code);
      toast.success(res?.message || "تم ربط الطالب");
      setLinkCode("");
      const studentId = res?.data?.student_id;
      if (studentId) syncUrl({ student: studentId });
      await loadChildren();
    } catch (err) {
      toast.error(err.message || "تعذر ربط الطالب");
    } finally {
      setLinking(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedId) return;
    setDownloading(true);
    try {
      const blob = await parentApi.downloadReport(selectedId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `peak-report-${report?.student?.full_name || "student"}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل التقرير");
    } catch (err) {
      toast.error(err.message || "تعذر تنزيل التقرير");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ParentReportView
      linkedChildren={linkedChildren}
      selectedId={selectedId}
      onSelectedIdChange={handleStudentChange}
      period={period}
      onPeriodChange={handlePeriodChange}
      dateFrom={dateFrom}
      onDateFromChange={handleDateFromChange}
      dateTo={dateTo}
      onDateToChange={handleDateToChange}
      report={report}
      linkCode={linkCode}
      onLinkCodeChange={setLinkCode}
      onLinkSubmit={handleLink}
      linking={linking}
      loading={loading}
      reportLoading={reportLoading}
      downloading={downloading}
      refreshing={refreshing}
      error={error}
      onRetry={loadChildren}
      onRefresh={() => loadReport(selectedId, { silent: true })}
      onDownload={handleDownload}
    />
  );
}

export default function ParentReportRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <SectionLoader message="جاري تحميل التقارير..." />
        </div>
      }
    >
      <ParentReportContent />
    </Suspense>
  );
}
