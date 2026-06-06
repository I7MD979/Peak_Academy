"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import StudentAskView from "@/components/student/StudentAskPage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { studentApi, logApiError } from "@/lib/api";
import { initiateQuestionPayment, pollQuestionPayment } from "@/lib/paymob";

const TABS = [
  { key: "all", label: "الكل" },
  { key: "unanswered", label: "بانتظار الرد" },
  { key: "answered", label: "تم الرد" }
];

const TAB_KEYS = new Set(TABS.map((t) => t.key));

const EMPTY_COPY = {
  all: {
    title: "لم تطرح أي سؤال بعد",
    hint: "اكتب سؤالك أعلاه وسيراجعه مدرس متخصص في المادة."
  },
  unanswered: {
    title: "لا توجد أسئلة بانتظار الرد",
    hint: "أسئلتك المجابة تظهر في تبويب «تم الرد»."
  },
  answered: {
    title: "لا توجد أسئلة مجابة بعد",
    hint: "عند رد المدرس سيظهر السؤال هنا."
  }
};

function readPage(searchParams) {
  const raw = Number(searchParams.get("page") || "1");
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(100, Math.floor(raw));
}

function StudentAskContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = useMemo(() => {
    const raw = searchParams.get("tab") || "all";
    return TAB_KEYS.has(raw) ? raw : "all";
  }, [searchParams]);

  const page = useMemo(() => readPage(searchParams), [searchParams]);
  const listSubject = useMemo(() => searchParams.get("subject") || "", [searchParams]);
  const dateFrom = useMemo(() => searchParams.get("from") || "", [searchParams]);
  const dateTo = useMemo(() => searchParams.get("to") || "", [searchParams]);

  const [overview, setOverview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("math");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);

  const replaceUrl = useCallback(
    (patch, { resetPage = false } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (key === "tab") {
          if (!value || value === "all") params.delete("tab");
          else params.set("tab", String(value));
          return;
        }
        if (key === "page") {
          const p = Number(value);
          if (!Number.isFinite(p) || p <= 1) params.delete("page");
          else params.set("page", String(p));
          return;
        }
        if (value === "" || value == null) params.delete(key);
        else params.set(key, String(value));
      });
      if (resetPage) params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `/student/ask?${qs}` : "/student/ask", { scroll: false });
    },
    [router, searchParams]
  );

  const loadOverview = useCallback(async () => {
    try {
      const res = await studentApi.questionsOverview();
      const payload = res?.data || null;
      setOverview(payload);
      setProfileIncomplete(false);
      if (payload?.subjects?.length) {
        setSelectedSubject((current) =>
          payload.subjects.some((s) => s.key === current) ? current : payload.subjects[0].key
        );
      }
      setError("");
      return payload;
    } catch (err) {
      logApiError("student/ask/overview", err);
      const message = err.message || "تعذر تحميل الصفحة";
      if (message.includes("صفك") || message.includes("ملفك")) {
        setProfileIncomplete(true);
        setError("");
      } else {
        setError(message);
      }
      setOverview(null);
      return null;
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ tab, page: String(page), limit: "8" });
      if (listSubject) params.set("subject", listSubject);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await studentApi.questions(params.toString());
      setQuestions(res?.data?.questions || []);
      setPagination(res?.data?.pagination || null);
    } catch (err) {
      logApiError("student/ask/questions", err);
      setQuestions([]);
      toast.error(err.message || "تعذر تحميل الأسئلة");
    } finally {
      setListLoading(false);
    }
  }, [tab, page, listSubject, dateFrom, dateTo]);

  const refreshAll = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      await loadOverview();
      setLoading(false);
      setRefreshing(false);
    },
    [loadOverview]
  );

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!loading && overview && !profileIncomplete) {
      loadQuestions();
    }
  }, [loading, overview, profileIncomplete, loadQuestions]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function handlePaymentReturn() {
      const params = new URLSearchParams(window.location.search);
      if (params.get("paid") !== "1") return;

      const txId = sessionStorage.getItem("peak-tx-question");
      if (txId) {
        const fulfilled = await pollQuestionPayment(txId);
        sessionStorage.removeItem("peak-tx-question");
        if (fulfilled) toast.success("تم استلام الدفع وإرسال سؤالك.");
        else toast.message("تم استلام الدفع. إذا لم يظهر سؤالك فوراً، حدّث الصفحة خلال لحظات.");
      } else {
        toast.success("تم استلام الدفع. إذا لم يظهر سؤالك فوراً، حدّث الصفحة خلال لحظات.");
      }

      params.delete("paid");
      const qs = params.toString();
      router.replace(qs ? `/student/ask?${qs}` : "/student/ask", { scroll: false });

      await loadOverview();
      await loadQuestions();
    }

    handlePaymentReturn();
  }, [loadOverview, loadQuestions, router]);

  const selectedSubjectMeta = overview?.subjects?.find((s) => s.key === selectedSubject);
  const price = selectedSubjectMeta?.price ?? 0;
  const isFree = selectedSubjectMeta?.is_free !== false;
  const stats = overview?.stats || {};
  const empty = EMPTY_COPY[tab] || EMPTY_COPY.all;
  const totalPages = pagination?.totalPages || 1;
  const totalCount = pagination?.total ?? questions.length;
  const contentLength = content.trim().length;

  const subjectOptions = useMemo(
    () =>
      (overview?.subjects || []).map((s) => ({
        value: s.key,
        label: s.is_free ? `${s.label} — مجاني` : `${s.label} — ${s.price} جنيه`
      })),
    [overview?.subjects]
  );

  const filterSubjectOptions = useMemo(
    () => [{ value: "", label: "جميع المواد" }, ...(overview?.subjects || []).map((s) => ({ value: s.key, label: s.label }))],
    [overview?.subjects]
  );

  const handleSubmit = async (withPayment = false) => {
    if (!selectedSubject) {
      toast.error("اختر المادة");
      return;
    }
    if (contentLength < 10) {
      toast.error("اكتب سؤالك بوضوح (10 أحرف على الأقل)");
      return;
    }

    if (withPayment && price > 0) {
      setPaying(true);
      try {
        const { checkoutUrl, transactionId } = await initiateQuestionPayment(price, {
          subject: selectedSubject,
          content: content.trim(),
          grade: overview?.grade
        });
        if (!checkoutUrl) throw new Error("لم يتم استلام رابط الدفع");
        if (transactionId) sessionStorage.setItem("peak-tx-question", transactionId);
        window.location.href = checkoutUrl;
      } catch (err) {
        toast.error(err.message || "تعذر بدء الدفع");
      } finally {
        setPaying(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await studentApi.askQuestion({
        subject: selectedSubject,
        content: content.trim()
      });

      if (res?.data?.requires_payment) {
        setPendingPayment({ amount: res?.data?.amount, subject: selectedSubject });
        toast.message("هذا السؤال يتطلب دفعاً قبل الإرسال");
        return;
      }

      toast.success(res?.message || "تم إرسال سؤالك");
      setContent("");
      setPendingPayment(null);
      await loadOverview();
      await loadQuestions();
    } catch (err) {
      if (err?.status === 402 && err?.data?.requires_payment) {
        setPendingPayment({ amount: err.data.amount, subject: selectedSubject });
        toast.message("هذا السؤال يتطلب دفعاً قبل الإرسال");
        return;
      }
      toast.error(err.message || "تعذر إرسال السؤال");
    } finally {
      setSubmitting(false);
    }
  };

  const clearListFilters = () => {
    replaceUrl({ subject: "", from: "", to: "" }, { resetPage: true });
  };

  return (
    <StudentAskView
      gradeLabel={overview?.grade_label || ""}
      stats={stats}
      subjects={overview?.subjects || []}
      subjectOptions={subjectOptions}
      filterSubjectOptions={filterSubjectOptions}
      selectedSubject={selectedSubject}
      onSelectedSubjectChange={setSelectedSubject}
      content={content}
      onContentChange={setContent}
      contentLength={contentLength}
      price={price}
      isFree={isFree}
      pendingPayment={pendingPayment}
      onSubmitFree={() => handleSubmit(false)}
      onSubmitPaid={() => handleSubmit(true)}
      submitting={submitting}
      paying={paying}
      tab={tab}
      tabs={TABS}
      onTabChange={(next) => replaceUrl({ tab: next }, { resetPage: true })}
      listSubject={listSubject}
      onListSubjectChange={(value) => replaceUrl({ subject: value }, { resetPage: true })}
      dateFrom={dateFrom}
      onDateFromChange={(value) => replaceUrl({ from: value }, { resetPage: true })}
      dateTo={dateTo}
      onDateToChange={(value) => replaceUrl({ to: value }, { resetPage: true })}
      onClearListFilters={clearListFilters}
      questions={questions}
      expandedId={expandedId}
      onToggleQuestion={(id) => setExpandedId((cur) => (cur === id ? null : id))}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      onPageChange={(next) => replaceUrl({ page: String(next) })}
      loading={loading}
      listLoading={listLoading}
      refreshing={refreshing}
      error={error}
      profileIncomplete={profileIncomplete}
      onRefresh={() => refreshAll({ silent: true })}
      emptyTitle={empty.title}
      emptyHint={empty.hint}
    />
  );
}

export default function StudentAskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <SectionLoader message="جاري تحميل صفحة الأسئلة..." />
        </div>
      }
    >
      <StudentAskContent />
    </Suspense>
  );
}
