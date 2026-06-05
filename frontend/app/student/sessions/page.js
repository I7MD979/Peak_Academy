"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SessionCard from "@/components/sessions/SessionCard";
import EmptyState from "@/components/shared/EmptyState";
import { PageLoader, SessionsListSkeleton } from "@/components/shared/LoadingSkeleton";
import { Select } from "@/components/ui/Select";
import Icon from "@/components/shared/Icon";
import { studentApi } from "@/lib/api";
import { mapSessionForCard } from "@/lib/session-mapper";
import { SUBJECT_OPTIONS } from "@/lib/subjects";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "available", label: "متاحة للحجز", icon: "book" },
  { key: "mine", label: "جلساتي", icon: "calendarDays" },
  { key: "live", label: "مباشرة الآن", icon: "live" },
  { key: "completed", label: "منتهية", icon: "check" }
];

const SCHOOL_LEVEL_FILTERS = [
  { key: "", label: "الكل" },
  { key: "preparatory", label: "إعدادي" },
  { key: "secondary", label: "ثانوي" }
];

const EMPTY_COPY = {
  available: {
    title: "لا توجد جلسات متاحة حالياً",
    hint: "جرّب إلغاء فلتر صفك أو عد لاحقاً عند إضافة جلسات جديدة."
  },
  mine: {
    title: "لم تسجّل في أي جلسة بعد",
    hint: "تصفّح الجلسات المتاحة واحجز جلستك الأولى."
  },
  live: {
    title: "لا توجد جلسات مباشرة الآن",
    hint: "عند بدء مدرسك الجلسة ستظهر هنا للدخول فوراً."
  },
  completed: {
    title: "لا توجد جلسات منتهية",
    hint: "بعد إكمال جلساتك المسجّل فيها ستظهر في هذا القسم."
  }
};

function StudentSessionsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("available");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [onlyMyGrade, setOnlyMyGrade] = useState(true);
  const [schoolLevelFilter, setSchoolLevelFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [sessions, setSessions] = useState([]);
  const [tabCounts, setTabCounts] = useState({});
  const [gradeLabel, setGradeLabel] = useState("");
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && TABS.some((item) => item.key === urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch, onlyMyGrade, subjectFilter, maxPrice, schoolLevelFilter]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        tab,
        page: String(page),
        limit: "12",
        only_my_grade: onlyMyGrade ? "true" : "false"
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (subjectFilter) params.set("subject", subjectFilter);
      if (maxPrice) params.set("max_price", maxPrice);
      if (schoolLevelFilter) params.set("school_level", schoolLevelFilter);

      const res = await studentApi.sessions(params.toString());
      const payload = res?.data || {};
      const mapped = (payload.sessions || []).map((session) =>
        mapSessionForCard(session, { isEnrolled: session.is_enrolled })
      );

      setSessions(mapped);
      setTabCounts(payload.tab_counts || {});
      setGradeLabel(payload.grade_label || "");
      setPagination(payload.pagination || null);
    } catch (err) {
      setSessions([]);
      setError(err.message || "تعذر تحميل الجلسات");
    } finally {
      setLoading(false);
    }
  }, [tab, page, debouncedSearch, onlyMyGrade, subjectFilter, maxPrice, schoolLevelFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          tab,
          page: String(page),
          limit: "12",
          only_my_grade: onlyMyGrade ? "true" : "false"
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (subjectFilter) params.set("subject", subjectFilter);
        if (maxPrice) params.set("max_price", maxPrice);
        if (schoolLevelFilter) params.set("school_level", schoolLevelFilter);

        const res = await studentApi.sessions(params.toString());
        if (cancelled) return;
        const payload = res?.data || {};
        const mapped = (payload.sessions || []).map((session) =>
          mapSessionForCard(session, { isEnrolled: session.is_enrolled })
        );

        setSessions(mapped);
        setTabCounts(payload.tab_counts || {});
        setGradeLabel(payload.grade_label || "");
        setPagination(payload.pagination || null);
      } catch (err) {
        if (!cancelled) {
          setSessions([]);
          setError(err.message || "تعذر تحميل الجلسات");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, page, debouncedSearch, onlyMyGrade, subjectFilter, maxPrice, schoolLevelFilter]);

  const empty = EMPTY_COPY[tab] || EMPTY_COPY.available;
  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="page-hero">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/70">جلساتي التعليمية</p>
            <h1 className="mt-1 text-2xl font-black">الجلسات</h1>
            <p className="mt-2 text-sm text-white/75">
              {gradeLabel
                ? `صفك: ${gradeLabel} — احجز جلسات مناسبة لمستواك أو تابع جلساتك المسجّلة.`
                : "تصفّح الجلسات المتاحة، تابع حجوزاتك، وادخل البث المباشر."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={loadSessions}
            disabled={loading}
          >
            تحديث
          </Button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-bold text-destructive">{error}</p>
          <Button type="button" className="mt-3" variant="outline" onClick={loadSessions}>
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      <section className="glass-card space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بعنوان الجلسة..."
              className="pr-10"
              aria-label="بحث في الجلسات"
            />
          </div>

          <Select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="font-semibold"
            aria-label="فلتر المادة"
          >
            <option value="">كل المواد</option>
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>

          <Input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="حد أقصى للسعر"
            className="w-full sm:w-36"
            aria-label="حد أقصى للسعر"
          />

          {tab === "available" ? (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-text">
              <input
                type="checkbox"
                checked={onlyMyGrade}
                onChange={(e) => setOnlyMyGrade(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              جلسات صفي فقط
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {SCHOOL_LEVEL_FILTERS.map((item) => {
            const active = schoolLevelFilter === item.key;
            return (
              <button
                key={item.key || "all"}
                type="button"
                onClick={() => setSchoolLevelFilter(item.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-text hover:border-primary/40"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => {
            const count = tabCounts[item.key];
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors",
                  active
                    ? "border-accent bg-accent text-white shadow-sm"
                    : "border-border bg-card text-text hover:border-accent/40"
                )}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
                {typeof count === "number" ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      active ? "bg-white/20" : "bg-bg text-text-muted"
                    )}
                  >
                    {count.toLocaleString("ar-EG")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <SessionsListSkeleton />
        </div>
      ) : null}

      {!loading && !error && sessions.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} showEnroll={tab === "available"} />
          ))}
        </div>
      ) : null}

      {!loading && !error && !sessions.length ? (
        <EmptyState title={empty.title} description={empty.hint} />
      ) : null}

      {!loading && !error && totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            السابق
          </Button>
          <span className="px-3 text-sm font-semibold text-text-muted">
            صفحة {page.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")}
          </span>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function StudentSessionsPage() {
  return (
    <Suspense
      fallback={<PageLoader />}
    >
      <StudentSessionsContent />
    </Suspense>
  );
}
