"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import SessionDetailsModal from "@/components/admin/SessionDetailsModal";
import AdminSessionsView from "@/components/admin/AdminSessionsPage";
import StatusBadge from "@/components/admin/StatusBadge";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { dashboardApi, sessionsApi } from "@/lib/api";
import {
  formatCurrencyEgp,
  formatDateTimeAr,
  formatGradeAr,
  formatSchoolLevelAr
} from "@/lib/format";
import { cn } from "@/lib/utils";

const statusTabs = [
  { key: "all", label: "الكل" },
  { key: "scheduled", label: "قادمة" },
  { key: "live", label: "مباشرة" },
  { key: "completed", label: "منتهية" },
  { key: "cancelled", label: "ملغاة" }
];

const VALID_STATUSES = new Set(statusTabs.map((t) => t.key));
const VALID_SCHOOL_LEVELS = new Set(["preparatory", "secondary"]);
const VALID_GRADES = new Set([
  "prep_first",
  "prep_second",
  "prep_third",
  "sec_first",
  "sec_second",
  "sec_third"
]);

function getEnrollmentCount(session) {
  return session?.enrollments?.[0]?.count ?? session?.enrollment_count ?? 0;
}

function canCancelSession(session) {
  return session?.status === "scheduled" || session?.status === "live";
}

function readFiltersFromParams(searchParams) {
  const status = searchParams.get("status");
  return {
    statusFilter: VALID_STATUSES.has(status) ? status : "all",
    schoolLevelFilter: VALID_SCHOOL_LEVELS.has(searchParams.get("school_level"))
      ? searchParams.get("school_level")
      : "",
    gradeFilter: VALID_GRADES.has(searchParams.get("grade")) ? searchParams.get("grade") : "",
    scheduledFrom: searchParams.get("from") || "",
    scheduledTo: searchParams.get("to") || "",
    search: searchParams.get("q") || "",
    page: Math.max(Number(searchParams.get("page")) || 1, 1)
  };
}

function AdminSessionsRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo(() => readFiltersFromParams(searchParams), [searchParams]);

  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [error, setError] = useState("");
  const [mutatingId, setMutatingId] = useState("");

  const [page, setPage] = useState(initial.page);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);

  const [statusFilter, setStatusFilter] = useState(initial.statusFilter);
  const [schoolLevelFilter, setSchoolLevelFilter] = useState(initial.schoolLevelFilter);
  const [gradeFilter, setGradeFilter] = useState(initial.gradeFilter);
  const [scheduledFrom, setScheduledFrom] = useState(initial.scheduledFrom);
  const [scheduledTo, setScheduledTo] = useState(initial.scheduledTo);
  const [searchInput, setSearchInput] = useState(initial.search);
  const [search, setSearch] = useState(initial.search);

  const [selectedSession, setSelectedSession] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const syncUrl = useCallback(
    (next) => {
      const params = new URLSearchParams();
      if (next.statusFilter && next.statusFilter !== "all") params.set("status", next.statusFilter);
      if (next.schoolLevelFilter) params.set("school_level", next.schoolLevelFilter);
      if (next.gradeFilter) params.set("grade", next.gradeFilter);
      if (next.scheduledFrom) params.set("from", next.scheduledFrom);
      if (next.scheduledTo) params.set("to", next.scheduledTo);
      if (next.search) params.set("q", next.search);
      if (next.page > 1) params.set("page", String(next.page));

      const qs = params.toString();
      router.replace(qs ? `/admin/sessions?${qs}` : "/admin/sessions", { scroll: false });
    },
    [router]
  );

  const filterSnapshot = useCallback(
    () => ({
      statusFilter,
      schoolLevelFilter,
      gradeFilter,
      scheduledFrom,
      scheduledTo,
      search,
      page
    }),
    [statusFilter, schoolLevelFilter, gradeFilter, scheduledFrom, scheduledTo, search, page]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    syncUrl(filterSnapshot());
  }, [filterSnapshot, syncUrl]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await dashboardApi.adminSessionsStats();
      setStats(res?.data || null);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", status: statusFilter });
      if (search) params.set("search", search);
      if (schoolLevelFilter) params.set("school_level", schoolLevelFilter);
      if (gradeFilter) params.set("grade", gradeFilter);
      if (scheduledFrom) params.set("scheduled_from", scheduledFrom);
      if (scheduledTo) params.set("scheduled_to", scheduledTo);

      const payload = await dashboardApi.adminSessions(params.toString());
      setSessions(payload?.data || []);
      setTotalPages(payload?.pagination?.totalPages || 1);
      setTotalSessions(payload?.pagination?.total || 0);
    } catch (err) {
      setSessions([]);
      setTotalPages(1);
      setTotalSessions(0);
      setError(err.message || "تعذر تحميل الجلسات");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, schoolLevelFilter, gradeFilter, scheduledFrom, scheduledTo]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStats(), loadSessions()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadStats, loadSessions]);

  const handleCancel = async (session) => {
    setMutatingId(session.id);
    try {
      await sessionsApi.cancel(session.id);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, status: "cancelled" } : s)));
      setSelectedSession((prev) => (prev?.id === session.id ? { ...prev, status: "cancelled" } : prev));
      toast.success("تم إلغاء الجلسة بنجاح");
      setCancelTarget(null);
      await loadStats();
    } catch (err) {
      toast.error(err.message || "فشل إلغاء الجلسة");
    } finally {
      setMutatingId("");
    }
  };

  const handleCloseOpenSessions = async () => {
    setClosingOpen(true);
    try {
      const res = await sessionsApi.closeOpen();
      const payload = res?.data || {};
      toast.success(res?.message || `تم إغلاق ${payload.total ?? 0} جلسة مفتوحة`);
      setConfirmCloseOpen(false);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر إغلاق الجلسات المفتوحة");
    } finally {
      setClosingOpen(false);
    }
  };

  const handleSchoolLevelChange = (value) => {
    setPage(1);
    setSchoolLevelFilter(value);
    if (gradeFilter) {
      const prep = gradeFilter.startsWith("prep_");
      const sec = gradeFilter.startsWith("sec_");
      if ((value === "preparatory" && sec) || (value === "secondary" && prep)) {
        setGradeFilter("");
      }
    }
  };

  const clearAllFilters = () => {
    setPage(1);
    setSchoolLevelFilter("");
    setGradeFilter("");
    setScheduledFrom("");
    setScheduledTo("");
    setSearchInput("");
    setSearch("");
  };

  const openSession = (row) => setSelectedSession(row);

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "الجلسة",
        render: (row) => (
          <button type="button" className="min-w-0 max-w-full text-start sm:min-w-[180px]" onClick={() => openSession(row)}>
            <p className="font-bold text-on-surface hover:text-md-primary">{row.title}</p>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {row.subject?.icon ? `${row.subject.icon} ` : ""}
              {row.subject?.name_ar || row.subject || "مادة عامة"}
            </p>
          </button>
        )
      },
      {
        key: "teacher",
        label: "المدرس",
        render: (row) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-primary/15 text-xs font-black text-md-primary">
              {(row.teacher?.full_name || "?").slice(0, 1)}
            </div>
            <span className="text-on-surface">{row.teacher?.full_name || "—"}</span>
          </div>
        )
      },
      {
        key: "level",
        label: "المرحلة / الصف",
        render: (row) => (
          <div className="text-xs">
            <p className="font-bold text-on-surface">{formatSchoolLevelAr(row.school_level)}</p>
            <p className="text-on-surface-variant">{formatGradeAr(row.grade)}</p>
          </div>
        )
      },
      {
        key: "scheduled_at",
        label: "الموعد",
        render: (row) => <span className="text-on-surface">{formatDateTimeAr(row.scheduled_at)}</span>
      },
      {
        key: "students",
        label: "الطلاب",
        render: (row) => {
          const enrolled = getEnrollmentCount(row);
          const max = row.max_students || 0;
          const full = max > 0 && enrolled >= max;
          return (
            <span className={cn("font-bold", full ? "text-danger" : "text-on-surface")}>
              {enrolled}/{max || "—"}
            </span>
          );
        }
      },
      {
        key: "price",
        label: "السعر",
        render: (row) => (
          <span className="font-bold text-md-primary">{formatCurrencyEgp(row.price_per_student)}</span>
        )
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.status} variant="session" />
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => {
          const busy = mutatingId === row.id;
          const cancellable = canCancelSession(row);

          const items = [
            {
              label: "عرض التفاصيل",
              icon: "video",
              onClick: () => openSession(row)
            },
            cancellable
              ? {
                  label: row.status === "live" ? "إيقاف وإلغاء البث" : "إلغاء الجلسة",
                  icon: "close",
                  tone: "danger",
                  disabled: busy,
                  onClick: () => setCancelTarget(row)
                }
              : null
          ].filter(Boolean);

          if (items.length === 0) {
            return <span className="text-xs text-on-surface-variant">—</span>;
          }

          return <AdminActionsMenu items={items} disabled={busy} label={busy ? "جاري..." : "إجراءات"} />;
        }
      }
    ],
    [mutatingId]
  );

  const liveTab = stats?.live > 0 ? { badge: stats.live } : undefined;
  const tabsWithBadge = statusTabs.map((tab) =>
    tab.key === "live" && liveTab ? { ...tab, ...liveTab } : tab
  );

  return (
    <>
      <AdminSessionsView
        sessions={sessions}
        columns={columns}
        loading={loading}
        error={error}
        stats={stats}
        statsLoading={statsLoading}
        refreshing={refreshing}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => {
          setPage(1);
          setStatusFilter(v);
        }}
        statusTabs={tabsWithBadge}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        schoolLevelFilter={schoolLevelFilter}
        onSchoolLevelFilterChange={handleSchoolLevelChange}
        gradeFilter={gradeFilter}
        onGradeFilterChange={(v) => {
          setPage(1);
          setGradeFilter(v);
        }}
        scheduledFrom={scheduledFrom}
        onScheduledFromChange={(v) => {
          setPage(1);
          setScheduledFrom(v);
        }}
        scheduledTo={scheduledTo}
        onScheduledToChange={(v) => {
          setPage(1);
          setScheduledTo(v);
        }}
        onClearDates={() => {
          setPage(1);
          setScheduledFrom("");
          setScheduledTo("");
        }}
        onClearFilters={clearAllFilters}
        page={page}
        totalPages={totalPages}
        totalSessions={totalSessions}
        onPageChange={setPage}
        onRefresh={refreshAll}
        onCloseOpenSessions={() => setConfirmCloseOpen(true)}
        closingOpen={closingOpen}
        onStatFilter={(filter) => {
          setPage(1);
          setStatusFilter(filter);
        }}
      />

      <SessionDetailsModal
        session={selectedSession}
        busy={mutatingId === selectedSession?.id}
        canCancel={canCancelSession(selectedSession)}
        onClose={() => setSelectedSession(null)}
        onCancel={(session) => setCancelTarget(session)}
      />

      <AdminConfirmDialog
        open={Boolean(cancelTarget)}
        title={cancelTarget?.status === "live" ? "إيقاف الجلسة المباشرة" : "إلغاء الجلسة"}
        description={
          cancelTarget?.status === "live"
            ? `هل تريد إيقاف وإلغاء الجلسة المباشرة «${cancelTarget?.title || ""}»؟ سيتم إيقاف البث وإعادة المبالغ للطلاب.`
            : `هل تريد إلغاء الجلسة «${cancelTarget?.title || ""}»؟ سيتم إشعار المسجلين وإعادة المبالغ.`
        }
        confirmLabel={cancelTarget?.status === "live" ? "إيقاف وإلغاء" : "إلغاء الجلسة"}
        tone="danger"
        loading={mutatingId === cancelTarget?.id}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && handleCancel(cancelTarget)}
      />

      <AdminConfirmDialog
        open={confirmCloseOpen}
        title="إغلاق الجلسات المفتوحة"
        description="سيتم إغلاق جميع الجلسات المجدولة أو المباشرة التي لم تُنهَ بشكل صحيح، وتنظيف غرف الفيديو اليتيمة. استخدم هذا عند وجود جلسات عالقة."
        confirmLabel="تأكيد الإغلاق"
        tone="primary"
        loading={closingOpen}
        onClose={() => setConfirmCloseOpen(false)}
        onConfirm={handleCloseOpenSessions}
      />
    </>
  );
}

export default function AdminSessionsPage() {
  return (
    <Suspense fallback={<SectionLoader message="جاري تحميل الجلسات..." />}>
      <AdminSessionsRoute />
    </Suspense>
  );
}
