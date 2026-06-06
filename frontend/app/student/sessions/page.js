"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StudentSessionsView from "@/components/student/StudentSessionsPage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { studentApi, logApiError } from "@/lib/api";
import { mapSessionForCard } from "@/lib/session-mapper";
import { SUBJECT_OPTIONS } from "@/lib/subjects";
import {
  STUDENT_SESSION_EMPTY_COPY,
  STUDENT_SESSION_MAX_PRICE_OPTIONS,
  STUDENT_SESSION_SCHOOL_LEVEL_OPTIONS,
  STUDENT_SESSION_TABS,
  buildStudentSessionsApiQuery,
  patchStudentSessionsUrl,
  readStudentSessionPage,
  readStudentSessionParam,
  resolveStudentSessionTab
} from "@/lib/student-sessions";

function StudentSessionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = useMemo(() => resolveStudentSessionTab(searchParams), [searchParams]);
  const page = useMemo(() => readStudentSessionPage(searchParams), [searchParams]);
  const urlSearch = useMemo(() => readStudentSessionParam(searchParams, "q"), [searchParams]);
  const schoolLevel = useMemo(() => readStudentSessionParam(searchParams, "school_level"), [searchParams]);
  const subject = useMemo(() => readStudentSessionParam(searchParams, "subject"), [searchParams]);
  const maxPrice = useMemo(() => readStudentSessionParam(searchParams, "max_price"), [searchParams]);
  const dateFrom = useMemo(() => readStudentSessionParam(searchParams, "from"), [searchParams]);
  const dateTo = useMemo(() => readStudentSessionParam(searchParams, "to"), [searchParams]);
  const onlyMyGrade = useMemo(
    () => readStudentSessionParam(searchParams, "only_my_grade", "true") !== "false",
    [searchParams]
  );

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [sessions, setSessions] = useState([]);
  const [tabCounts, setTabCounts] = useState({});
  const [gradeLabel, setGradeLabel] = useState("");
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  const subjectOptions = useMemo(
    () => [{ value: "", label: "جميع المواد" }, ...SUBJECT_OPTIONS.map((item) => ({ value: item.key, label: item.label }))],
    []
  );

  const replaceUrl = useCallback(
    (patch, options) => {
      router.replace(patchStudentSessionsUrl(searchParams, patch, options), { scroll: false });
    },
    [router, searchParams]
  );

  const loadSessions = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const query = buildStudentSessionsApiQuery({
          tab,
          page,
          urlSearch,
          onlyMyGrade,
          schoolLevel,
          subject,
          maxPrice,
          dateFrom,
          dateTo
        });

        const res = await studentApi.sessions(query);
        const payload = res?.data || {};
        const mapped = (payload.sessions || []).map((session) =>
          mapSessionForCard(session, { isEnrolled: session.is_enrolled ?? tab !== "available" })
        );

        setSessions(mapped);
        setTabCounts(payload.tab_counts || {});
        setGradeLabel(payload.grade_label || "");
        setPagination(payload.pagination || null);
      } catch (err) {
        logApiError("student/sessions", err);
        if (!silent) setSessions([]);
        setError(err.message || "تعذر تحميل الجلسات");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab, page, urlSearch, onlyMyGrade, schoolLevel, subject, maxPrice, dateFrom, dateTo]
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const totalPages = pagination?.totalPages || 1;
  const totalCount = pagination?.total ?? sessions.length;
  const empty = STUDENT_SESSION_EMPTY_COPY[tab] || STUDENT_SESSION_EMPTY_COPY.available;

  const clearFilters = () => {
    replaceUrl(
      {
        q: "",
        school_level: "",
        subject: "",
        max_price: "",
        from: "",
        to: "",
        only_my_grade: "true"
      },
      { resetPage: true }
    );
    setSearchInput("");
  };

  return (
    <StudentSessionsView
      tab={tab}
      tabs={STUDENT_SESSION_TABS}
      onTabChange={(next) => replaceUrl({ tab: next }, { resetPage: true })}
      search={searchInput}
      onSearchChange={setSearchInput}
      onSearchSubmit={() => replaceUrl({ q: searchInput.trim() }, { resetPage: true })}
      onlyMyGrade={onlyMyGrade}
      onOnlyMyGradeChange={(checked) => replaceUrl({ only_my_grade: checked ? "true" : "false" }, { resetPage: true })}
      schoolLevel={schoolLevel}
      onSchoolLevelChange={(value) => replaceUrl({ school_level: value }, { resetPage: true })}
      schoolLevelOptions={STUDENT_SESSION_SCHOOL_LEVEL_OPTIONS}
      subject={subject}
      onSubjectChange={(value) => replaceUrl({ subject: value }, { resetPage: true })}
      subjectOptions={subjectOptions}
      maxPrice={maxPrice}
      onMaxPriceChange={(value) => replaceUrl({ max_price: value }, { resetPage: true })}
      maxPriceOptions={STUDENT_SESSION_MAX_PRICE_OPTIONS}
      dateFrom={dateFrom}
      onDateFromChange={(value) => replaceUrl({ from: value }, { resetPage: true })}
      dateTo={dateTo}
      onDateToChange={(value) => replaceUrl({ to: value }, { resetPage: true })}
      onClearFilters={clearFilters}
      sessions={sessions}
      tabCounts={tabCounts}
      gradeLabel={gradeLabel}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={() => loadSessions({ silent: true })}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      onPageChange={(next) => replaceUrl({ page: String(next) })}
      emptyTitle={empty.title}
      emptyHint={empty.hint}
      showEnroll={tab === "available"}
      showDateFilters={tab === "available" || tab === "mine"}
    />
  );
}

export default function StudentSessionsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <SectionLoader message="جاري تحميل الجلسات..." />
        </div>
      }
    >
      <StudentSessionsContent />
    </Suspense>
  );
}
