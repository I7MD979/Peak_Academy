"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TeacherAnalyticsView from "@/components/teacher/TeacherAnalyticsPage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { logApiError, teacherApi } from "@/lib/api";

const VALID_PERIODS = new Set(["month", "3months", "6months", "year"]);

function readParams(searchParams) {
  const period = searchParams.get("period");
  return {
    period: VALID_PERIODS.has(period) ? period : "6months",
    dateFrom: searchParams.get("from") || "",
    dateTo: searchParams.get("to") || ""
  };
}

function TeacherAnalyticsRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo(() => readParams(searchParams), [searchParams]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(initial.period);
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);

  const syncUrl = useCallback(
    (next) => {
      const params = new URLSearchParams();
      if (next.period && next.period !== "6months") params.set("period", next.period);
      if (next.dateFrom) params.set("from", next.dateFrom);
      if (next.dateTo) params.set("to", next.dateTo);
      const qs = params.toString();
      router.replace(qs ? `/teacher/analytics?${qs}` : "/teacher/analytics", { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    syncUrl({ period, dateFrom, dateTo });
  }, [period, dateFrom, dateTo, syncUrl]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await teacherApi.analytics({ period, from: dateFrom, to: dateTo });
      setData(res?.data || null);
    } catch (err) {
      logApiError("teacher/analytics", err);
      setData(null);
      setError(err.message || "تعذر تحميل التحليلات");
    } finally {
      setLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <TeacherAnalyticsView
      data={data}
      loading={loading}
      error={error}
      period={period}
      onPeriodChange={setPeriod}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      onClearDates={() => {
        setDateFrom("");
        setDateTo("");
      }}
      periodLabel={data?.period_label || ""}
      onRefresh={refresh}
      refreshing={refreshing}
    />
  );
}

export default function TeacherAnalyticsPage() {
  return (
    <Suspense fallback={<SectionLoader message="جاري تحميل التحليلات..." />}>
      <TeacherAnalyticsRoute />
    </Suspense>
  );
}
