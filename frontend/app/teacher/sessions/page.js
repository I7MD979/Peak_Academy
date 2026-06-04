"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import TeacherSessionDetailsModal from "@/components/teacher/TeacherSessionDetailsModal";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import { sessionsApi } from "@/lib/api";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import {
  getEnrollmentCount,
  getStartAvailability,
  getSubjectLabel,
  gradeLabels,
  isLiveSession,
  isScheduledSession
} from "@/lib/teacher-sessions";
import { cn } from "@/lib/utils";

const statusTabs = [
  { key: "all", label: "الكل" },
  { key: "scheduled", label: "قادمة" },
  { key: "live", label: "مباشرة الآن" },
  { key: "completed", label: "منتهية" },
  { key: "cancelled", label: "ملغاة" }
];

function SessionRowActions({
  session,
  actionId,
  onDetails,
  onStart,
  onEnd,
  onCancel,
  onJoin
}) {
  const startInfo = getStartAvailability(session);
  const busyStart = actionId === `start-${session.id}`;
  const busyEnd = actionId === `end-${session.id}`;
  const busyCancel = actionId === `cancel-${session.id}`;

  return (
    <div className="flex flex-nowrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => onDetails(session)}>
        التفاصيل
      </Button>

      {isLiveSession(session) ? (
        <>
          <Button type="button" size="sm" onClick={() => onJoin(session.id)}>
            دخول البث
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busyEnd}
            onClick={() => onEnd(session.id)}
          >
            {busyEnd ? "جارٍ..." : "إنهاء وحذف"}
          </Button>
        </>
      ) : null}

      {isScheduledSession(session) ? (
        <>
          <Button
            type="button"
            size="sm"
            disabled={!startInfo.canStart || busyStart}
            title={startInfo.reason || undefined}
            onClick={() => onStart(session.id)}
          >
            {busyStart ? "جارٍ..." : "بدء"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busyCancel}
            onClick={() => onCancel(session)}
          >
            {busyCancel ? "جارٍ..." : "إلغاء وحذف"}
          </Button>
        </>
      ) : null}
    </div>
  );
}

function SessionCard({ session, onDetails, onStart, onEnd, onCancel, onJoin, actionId }) {
  const enrolled = getEnrollmentCount(session);
  const max = session.max_students || 0;
  const full = max > 0 && enrolled >= max;
  const startInfo = getStartAvailability(session);
  const isLive = isLiveSession(session);
  const isScheduled = isScheduledSession(session);
  const busyStart = actionId === `start-${session.id}`;
  const busyEnd = actionId === `end-${session.id}`;
  const busyCancel = actionId === `cancel-${session.id}`;

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        isLive && "border-success/40 bg-success/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-text">{session.title}</h3>
          <p className="mt-1 text-sm text-text-muted">{getSubjectLabel(session)}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-text-muted">الموعد</dt>
          <dd className="font-semibold text-text">{formatDateTimeAr(session.scheduled_at)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">الطلاب</dt>
          <dd className={cn("font-bold", full ? "text-danger" : "text-text")}>
            {enrolled.toLocaleString("ar-EG")}/{max ? max.toLocaleString("ar-EG") : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">السعر</dt>
          <dd className="font-bold text-accent">{formatCurrencyEgp(session.price_per_student)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">الصف</dt>
          <dd className="font-semibold text-text">{gradeLabels[session.grade] || "—"}</dd>
        </div>
      </dl>

      {isScheduled && !startInfo.canStart && startInfo.reason ? (
        <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
          {startInfo.reason}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button href={`/teacher/sessions/${session.id}`} type="button" size="sm" variant="outline">
          التفاصيل
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onDetails(session)}>
          معاينة سريعة
        </Button>

        {isLive ? (
          <>
            <Button type="button" size="sm" onClick={() => onJoin(session.id)}>
              دخول البث
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={busyEnd}
              onClick={() => onEnd(session.id)}
            >
              {busyEnd ? "جارٍ..." : "إنهاء وحذف"}
            </Button>
          </>
        ) : null}

        {isScheduled ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={!startInfo.canStart || busyStart}
              onClick={() => onStart(session.id)}
            >
              {busyStart ? "جارٍ البدء..." : "بدء الجلسة"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busyCancel}
              onClick={() => onCancel(session)}
            >
              {busyCancel ? "جارٍ..." : "إلغاء وحذف"}
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}

export default function TeacherSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [tabCounts, setTabCounts] = useState({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [closingAll, setClosingAll] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const openSessionsCount = (tabCounts.live ?? 0) + (tabCounts.scheduled ?? 0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadTabCounts = useCallback(async (silent = false) => {
    if (!silent) setCountsLoading(true);
    try {
      const res = await sessionsApi.list("status=all&limit=100&page=1");
      const rows = res?.data || [];
      const counts = {
        all: res?.pagination?.total ?? rows.length,
        scheduled: 0,
        live: 0,
        completed: 0,
        cancelled: 0
      };
      for (const row of rows) {
        if (row?.status && counts[row.status] !== undefined) {
          counts[row.status] += 1;
        }
      }
      setTabCounts(counts);
    } catch {
      setTabCounts({});
    } finally {
      if (!silent) setCountsLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        limit: "12"
      });
      if (search) params.set("search", search);

      const res = await sessionsApi.list(params.toString());
      setSessions(res?.data || []);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalSessions(res?.pagination?.total || 0);
    } catch (err) {
      setSessions([]);
      setTotalPages(1);
      setTotalSessions(0);
      setError(err.message || "تعذر تحميل جلساتك");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    loadTabCounts();
  }, [loadTabCounts]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const refreshAll = async () => {
    await Promise.all([loadTabCounts(true), loadSessions()]);
  };

  const handleStart = async (id) => {
    const session = sessions.find((s) => s.id === id);
    const startInfo = session ? getStartAvailability(session) : { canStart: true };
    if (!startInfo.canStart) {
      toast.error(startInfo.reason || "لا يمكن بدء الجلسة الآن");
      return;
    }

    try {
      setActionId(`start-${id}`);
      setError("");
      const res = await sessionsApi.start(id);
      const roomUrl = res?.data?.room_url;
      if (res?.data?.room_warning) {
        toast.warning(res.data.room_warning);
      }
      await refreshAll();
      if (roomUrl) {
        toast.success("تم بدء الجلسة بنجاح");
        router.push(`/teacher/live/${id}`);
      } else {
        toast.success("تم بدء الجلسة. رابط الفيديو غير متاح بعد.");
      }
    } catch (err) {
      toast.error(err.message || "تعذر بدء الجلسة");
    } finally {
      setActionId("");
    }
  };

  const handleEnd = async (id) => {
    const confirmed = window.confirm("هل تريد إنهاء الجلسة؟ سيتم تسجيل الحضور وحساب الأرباح.");
    if (!confirmed) return;

    try {
      setActionId(`end-${id}`);
      setError("");
      await sessionsApi.end(id);
      toast.success("تم إنهاء الجلسة بنجاح");
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر إنهاء الجلسة");
    } finally {
      setActionId("");
    }
  };

  const handleCancel = async (session) => {
    const confirmed = window.confirm(`هل تريد إلغاء الجلسة "${session.title}"؟`);
    if (!confirmed) return;

    try {
      setActionId(`cancel-${session.id}`);
      setError("");
      await sessionsApi.cancel(session.id);
      toast.success("تم إلغاء الجلسة");
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر إلغاء الجلسة");
    } finally {
      setActionId("");
    }
  };

  const handleCloseAllOpen = async () => {
    if (openSessionsCount <= 0) {
      toast.info("لا توجد جلسات مفتوحة (مباشرة أو مجدولة)");
      return;
    }

    const confirmed = window.confirm(
      `سيتم إنهاء ${tabCounts.live ?? 0} جلسة مباشرة وإلغاء ${tabCounts.scheduled ?? 0} جلسة مجدولة، وحذف غرف الفيديو المرتبطة. هل تريد المتابعة؟`
    );
    if (!confirmed) return;

    try {
      setClosingAll(true);
      setError("");
      const res = await sessionsApi.closeOpen();
      const data = res?.data || {};
      const ended = data.ended ?? 0;
      const cancelled = data.cancelled ?? 0;
      if (data.failures?.length) {
        toast.warning(
          `تم إغلاق ${ended + cancelled} جلسة مع ${data.failures.length} أخطاء جزئية`
        );
      } else {
        toast.success(`تم الإغلاق: ${ended} مباشرة، ${cancelled} مجدولة`);
      }
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر إغلاق الجلسات المفتوحة");
    } finally {
      setClosingAll(false);
    }
  };

  const columns = [
      {
        key: "title",
        label: "الجلسة",
        render: (row) => (
          <div className="min-w-[180px]">
            <p className="font-bold text-text">{row.title}</p>
            <p className="mt-0.5 text-xs text-text-muted">{getSubjectLabel(row)}</p>
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
            <span className={cn("font-bold", full ? "text-danger" : "text-text")}>
              {enrolled.toLocaleString("ar-EG")}/{max ? max.toLocaleString("ar-EG") : "—"}
            </span>
          );
        }
      },
      {
        key: "price",
        label: "السعر",
        render: (row) => <span className="font-bold text-accent">{formatCurrencyEgp(row.price_per_student)}</span>
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.status} />
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => (
          <SessionRowActions
            session={row}
            actionId={actionId}
            onDetails={setSelectedSession}
            onStart={handleStart}
            onEnd={handleEnd}
            onCancel={handleCancel}
            onJoin={(id) => router.push(`/teacher/live/${id}`)}
          />
        )
      }
  ];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <section className="rounded-3xl bg-gradient-to-l from-primary to-[#0f1117] p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">جلساتي</p>
        <h1 className="mt-1 text-2xl font-black">إدارة جلساتك التعليمية</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          تابع الجلسات القادمة والمباشرة، ابدأ البث في الوقت المناسب، وأنهِ الجلسة لتسجيل الحضور والأرباح.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/teacher/sessions/new" className="rounded-xl bg-accent text-white hover:bg-orange-500">
            إنشاء جلسة جديدة
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={refreshAll}
            disabled={loading || countsLoading}
          >
            تحديث القائمة
          </Button>
          {openSessionsCount > 0 ? (
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={closingAll || countsLoading}
              onClick={handleCloseAllOpen}
            >
              {closingAll
                ? "جارٍ الإغلاق..."
                : `إغلاق كل الجلسات المفتوحة (${openSessionsCount})`}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setPage(1);
                setStatus(tab.key);
              }}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                status === tab.key
                  ? "bg-primary text-white"
                  : "border border-border bg-bg text-text-muted hover:text-text"
              )}
            >
              {tab.label}
              <span className="mr-1 text-xs opacity-80">
                ({countsLoading ? "…" : tabCounts[tab.key] ?? 0})
              </span>
              {tab.key === "live" ? (
                <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-success align-middle" />
              ) : null}
            </button>
          ))}
        </div>

        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="ابحث بعنوان الجلسة..."
          className="h-11 w-full rounded-xl border border-border px-4 text-sm font-cairo focus:border-accent focus:outline-none"
        />

        {openSessionsCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
            <p className="text-sm font-semibold text-text">
              لديك {openSessionsCount.toLocaleString("ar-EG")} جلسة مفتوحة (
              {(tabCounts.live ?? 0).toLocaleString("ar-EG")} مباشرة،{" "}
              {(tabCounts.scheduled ?? 0).toLocaleString("ar-EG")} مجدولة)
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={closingAll || countsLoading}
              onClick={handleCloseAllOpen}
            >
              {closingAll ? "جارٍ الإغلاق..." : "إغلاق وحذف كل الجلسات المفتوحة"}
            </Button>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-bold text-destructive">{error}</p>
          <Button type="button" className="mt-3" variant="outline" onClick={refreshAll}>
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <LoadingSkeleton />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-lg font-bold text-text">لا توجد جلسات مطابقة</p>
          <p className="mt-2 text-sm text-text-muted">جرّب تغيير الفلتر أو أنشئ جلسة جديدة للبدء.</p>
          <Button href="/teacher/sessions/new" className="mt-4">
            إنشاء أول جلسة
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:hidden">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                actionId={actionId}
                onDetails={setSelectedSession}
                onStart={handleStart}
                onEnd={handleEnd}
                onCancel={handleCancel}
                onJoin={(id) => router.push(`/teacher/live/${id}`)}
              />
            ))}
          </div>

          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={sessions.map((row) => ({ ...row, _key: row.id }))}
              loading={false}
              emptyMessage="لا توجد جلسات مطابقة"
              getRowClassName={(row) =>
                row.status === "live" ? "border-r-4 border-r-success bg-success/5" : ""
              }
            />
          </div>
        </>
      )}

      {!loading && sessions.length > 0 ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="text-text-muted">
            إجمالي النتائج: <span className="font-bold text-text">{totalSessions.toLocaleString("ar-EG")}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              السابق
            </Button>
            <span className="min-w-24 text-center font-semibold text-text-muted">
              صفحة {page.toLocaleString("ar-EG")} من {Math.max(1, totalPages).toLocaleString("ar-EG")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages || loading}
            >
              التالي
            </Button>
          </div>
        </section>
      ) : null}

      <TeacherSessionDetailsModal session={selectedSession} onClose={() => setSelectedSession(null)} />
    </div>
  );
}
