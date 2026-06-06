"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import TeacherSessionsView from "@/components/teacher/TeacherSessionsPage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { logApiError, sessionsApi, teacherApi } from "@/lib/api";
import { getStartAvailability } from "@/lib/teacher-sessions";
import {
  TEACHER_SESSION_EMPTY_COPY,
  TEACHER_SESSION_STATUS_TABS,
  buildTeacherSessionsApiQuery,
  patchTeacherSessionsUrl,
  readTeacherSessionPage,
  readTeacherSessionParam,
  resolveTeacherOpenSessionsCount,
  resolveTeacherSessionStatus
} from "@/lib/teacher-sessions-list";

function TeacherSessionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = useMemo(() => resolveTeacherSessionStatus(searchParams), [searchParams]);
  const page = useMemo(() => readTeacherSessionPage(searchParams), [searchParams]);
  const urlSearch = useMemo(() => readTeacherSessionParam(searchParams, "q"), [searchParams]);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [sessions, setSessions] = useState([]);
  const [tabCounts, setTabCounts] = useState({});
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [closingAll, setClosingAll] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const replaceUrl = useCallback(
    (patch, options) => {
      router.replace(patchTeacherSessionsUrl(searchParams, patch, options), { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed === urlSearch) return;
      replaceUrl({ q: trimmed }, { resetPage: true });
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput, urlSearch, replaceUrl]);

  const loadTabCounts = useCallback(async (silent = false) => {
    if (!silent) setCountsLoading(true);
    try {
      const res = await teacherApi.sessionCounts();
      setTabCounts(res?.data || {});
    } catch (err) {
      logApiError("teacher/sessions/counts", err);
      if (!silent) setTabCounts({});
    } finally {
      if (!silent) setCountsLoading(false);
    }
  }, []);

  const loadSessions = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const query = buildTeacherSessionsApiQuery({ status, page, search: urlSearch });
        const res = await sessionsApi.list(query);
        setSessions(res?.data || []);
        setPagination(res?.pagination || null);
      } catch (err) {
        logApiError("teacher/sessions", err);
        if (!silent) {
          setSessions([]);
          setPagination(null);
        }
        setError(err.message || "تعذر تحميل جلساتك");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, page, urlSearch]
  );

  useEffect(() => {
    loadTabCounts();
  }, [loadTabCounts]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadTabCounts(true), loadSessions({ silent: true })]);
  }, [loadTabCounts, loadSessions]);

  const totalPages = pagination?.totalPages || 1;
  const totalCount = pagination?.total ?? sessions.length;
  const empty = TEACHER_SESSION_EMPTY_COPY[status] || TEACHER_SESSION_EMPTY_COPY.all;
  const openSessionsCount = resolveTeacherOpenSessionsCount(tabCounts);

  const handleStart = async (id) => {
    const session = sessions.find((item) => item.id === id);
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

  const handlePurgeDailyOnly = async () => {
    const confirmed = window.confirm(
      "سيتم حذف كل غرف الفيديو التي تبدأ بـ session- من LiveKit (حتى اليتيمة). هل تريد المتابعة؟"
    );
    if (!confirmed) return;

    try {
      setClosingAll(true);
      const res = await sessionsApi.purgeDailyRooms();
      const deleted = res?.data?.deleted ?? 0;
      toast.success(`تم حذف ${deleted} غرفة من LiveKit`);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر تنظيف غرف LiveKit");
    } finally {
      setClosingAll(false);
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
      const dailyDeleted = data.daily_rooms_deleted ?? 0;

      if (data.failures?.length) {
        toast.warning(
          `تم إغلاق ${ended + cancelled} جلسة مع ${data.failures.length} أخطاء. حُذفت ${dailyDeleted} غرفة LiveKit.`
        );
      } else {
        toast.success(
          `تم الإغلاق: ${ended} مباشرة، ${cancelled} مجدولة. حُذفت ${dailyDeleted} غرفة فيديو من LiveKit.`
        );
      }

      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر إغلاق الجلسات المفتوحة");
    } finally {
      setClosingAll(false);
    }
  };

  return (
    <TeacherSessionsView
      status={status}
      statusTabs={TEACHER_SESSION_STATUS_TABS}
      tabCounts={tabCounts}
      countsLoading={countsLoading}
      onStatusChange={(next) => replaceUrl({ status: next }, { resetPage: true })}
      search={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => replaceUrl({ q: searchInput.trim() }, { resetPage: true })}
      sessions={sessions}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={refreshAll}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      onPageChange={(next) => replaceUrl({ page: String(next) })}
      emptyTitle={empty.title}
      emptyHint={empty.hint}
      actionId={actionId}
      closingAll={closingAll}
      onStart={handleStart}
      onEnd={handleEnd}
      onCancel={handleCancel}
      onJoin={(id) => router.push(`/teacher/live/${id}`)}
      onCloseAllOpen={handleCloseAllOpen}
      onPurgeRooms={handlePurgeDailyOnly}
      selectedSession={selectedSession}
      onSelectSession={setSelectedSession}
      onCloseDetails={() => setSelectedSession(null)}
    />
  );
}

export default function TeacherSessionsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <SectionLoader message="جاري تحميل جلساتك..." />
        </div>
      }
    >
      <TeacherSessionsContent />
    </Suspense>
  );
}
