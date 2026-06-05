"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/admin/StatsCard";
import QuestionCard from "@/components/student/QuestionCard";
import EmptyState from "@/components/shared/EmptyState";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import { questionsApi } from "@/lib/api";
import { initiateQuestionPayment, pollQuestionPayment } from "@/lib/paymob";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "all", label: "الكل", icon: "book" },
  { key: "unanswered", label: "بانتظار الرد", icon: "help" },
  { key: "answered", label: "تم الرد", icon: "check" }
];

const EMPTY_COPY = {
  all: {
    title: "لم تطرح أي سؤال بعد",
    hint: "اكتب سؤالك أدناه وسيراجعه مدرس متخصص في المادة."
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

export default function StudentAskPage() {
  const [overview, setOverview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("math");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);

  const loadOverview = useCallback(async () => {
    try {
      const res = await questionsApi.overview();
      const payload = res?.data || null;
      setOverview(payload);
      if (payload?.subjects?.length) {
        setSelectedSubject((current) =>
          payload.subjects.some((s) => s.key === current) ? current : payload.subjects[0].key
        );
      }
      setError("");
      return payload;
    } catch (err) {
      setOverview(null);
      setError(err.message || "تعذر تحميل الصفحة");
      return null;
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ tab, page: String(page), limit: "8" });
      const res = await questionsApi.list(params.toString());
      setQuestions(res?.data?.questions || []);
      setPagination(res?.data?.pagination || null);
    } catch (err) {
      setQuestions([]);
      toast.error(err.message || "تعذر تحميل الأسئلة");
    } finally {
      setListLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadOverview();
      setLoading(false);
    })();
  }, [loadOverview]);

  useEffect(() => {
    if (!loading && overview) loadQuestions();
  }, [loading, overview, loadQuestions]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function handlePaymentReturn() {
      const params = new URLSearchParams(window.location.search);
      if (params.get("paid") !== "1") return;

      const txId = sessionStorage.getItem("peak-tx-question");
      if (txId) {
        const fulfilled = await pollQuestionPayment(txId);
        sessionStorage.removeItem("peak-tx-question");
        if (fulfilled) {
          toast.success("تم استلام الدفع وإرسال سؤالك.");
        } else {
          toast.message("تم استلام الدفع. إذا لم يظهر سؤالك فوراً، حدّث الصفحة خلال لحظات.");
        }
      } else {
        toast.success("تم استلام الدفع. إذا لم يظهر سؤالك فوراً، حدّث الصفحة خلال لحظات.");
      }

      await loadOverview();
      await loadQuestions();
    }

    handlePaymentReturn();
  }, [loadOverview, loadQuestions]);

  const selectedSubjectMeta = overview?.subjects?.find((s) => s.key === selectedSubject);
  const price = selectedSubjectMeta?.price ?? 0;
  const isFree = selectedSubjectMeta?.is_free !== false;
  const stats = overview?.stats || {};
  const empty = EMPTY_COPY[tab] || EMPTY_COPY.all;
  const totalPages = pagination?.totalPages || 1;
  const contentLength = content.trim().length;

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
        if (transactionId) {
          sessionStorage.setItem("peak-tx-question", transactionId);
        }
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
      const res = await questionsApi.submit({
        subject: selectedSubject,
        content: content.trim()
      });

      if (res?.data?.requires_payment) {
        setPendingPayment({
          amount: res?.data?.amount,
          subject: selectedSubject
        });
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
        setPendingPayment({
          amount: err.data.amount,
          subject: selectedSubject
        });
        toast.message("هذا السؤال يتطلب دفعاً قبل الإرسال");
        return;
      }
      toast.error(err.message || "تعذر إرسال السؤال");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="page-hero">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/70">اسأل واتعلّم</p>
            <h1 className="mt-1 text-2xl font-black">اسأل مدرس</h1>
            <p className="mt-2 text-sm text-white/75">
              {overview?.grade_label
                ? `صفك: ${overview.grade_label} — اطرح سؤالك وسيجيبك مدرس متخصص.`
                : "اكتب سؤالك في أي مادة وسنوجّهه لمدرس مناسب."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={async () => {
              setLoading(true);
              await loadOverview();
              await loadQuestions();
              setLoading(false);
            }}
            disabled={loading}
          >
            تحديث
          </Button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-bold text-destructive">{error}</p>
          {error.includes("الصف") || error.includes("ملف") ? (
            <Link href="/student/profile" className="mt-2 inline-block text-sm font-bold text-accent">
              إكمال الملف الشخصي
            </Link>
          ) : (
            <Button
              type="button"
              className="mt-3"
              variant="outline"
              onClick={() => {
                setLoading(true);
                loadOverview().finally(() => setLoading(false));
              }}
            >
              إعادة المحاولة
            </Button>
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <SectionLoader />
        </div>
      ) : null}

      {!loading && overview ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatsCard
              title="إجمالي أسئلتي"
              value={(stats.total ?? 0).toLocaleString("ar-EG")}
              iconName="help"
              tone="blue"
              hint="كل الأسئلة التي أرسلتها"
            />
            <StatsCard
              title="بانتظار الرد"
              value={(stats.unanswered ?? 0).toLocaleString("ar-EG")}
              iconName="calendar"
              tone="warning"
              hint="قيد مراجعة المدرسين"
            />
            <StatsCard
              title="تم الرد عليها"
              value={(stats.answered ?? 0).toLocaleString("ar-EG")}
              iconName="check"
              tone="success"
              hint="أسئلة حصلت على إجابة"
            />
          </section>

          <section className="glass-card space-y-4 p-5">
            <div>
              <h2 className="text-lg font-black text-text">سؤال جديد</h2>
              <p className="mt-1 text-sm text-text-muted">
                اختر المادة، اكتب سؤالك بوضوح، ثم أرسله.{" "}
                {isFree ? "الإرسال مجاني لهذه المادة." : `رسوم السؤال: ${formatCurrencyEgp(price)}`}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-text">المادة</p>
              <div className="flex flex-wrap gap-2">
                {overview.subjects?.map((subject) => {
                  const active = selectedSubject === subject.key;
                  return (
                    <button
                      key={subject.key}
                      type="button"
                      onClick={() => {
                        setSelectedSubject(subject.key);
                        setPendingPayment(null);
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-bold transition-colors",
                        active
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-card text-text hover:border-accent/40"
                      )}
                    >
                      {subject.label}
                      {!subject.is_free ? (
                        <span className="mr-1 text-xs opacity-80">
                          · {formatCurrencyEgp(subject.price)}
                        </span>
                      ) : (
                        <span className="mr-1 text-xs opacity-80">· مجاني</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="question-content" className="mb-2 block text-sm font-bold text-text">
                نص السؤال
              </label>
              <textarea
                id="question-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="اكتب سؤالك بالتفصيل... مثال: مش فاهم درس المعادلات التربيعية في الفصل الثالث"
                className="flex w-full rounded-xl border border-border bg-card px-3 py-3 text-sm text-text shadow-sm transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              />
              <p className="mt-1 text-xs text-text-muted">
                {contentLength.toLocaleString("ar-EG")}/٢٠٠٠ حرف
                {contentLength > 0 && contentLength < 10 ? " — باقي أقل من 10 أحرف" : null}
              </p>
            </div>

            {pendingPayment ? (
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                <p className="text-sm font-bold text-warning">يتطلب الدفع قبل الإرسال</p>
                <p className="mt-1 text-sm text-text-muted">
                  المبلغ: {formatCurrencyEgp(pendingPayment.amount)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="accent"
                    className="rounded-xl"
                    disabled={paying}
                    onClick={() => handleSubmit(true)}
                  >
                    {paying ? "جارٍ التحويل للدفع..." : "ادفع وأرسل السؤال"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setPendingPayment(null)}
                  >
                    تعديل السؤال
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                className="rounded-xl"
                variant="accent"
                disabled={submitting || paying}
                onClick={() => handleSubmit(price > 0)}
              >
                {submitting
                  ? "جارٍ الإرسال..."
                  : paying
                    ? "جارٍ التحويل..."
                    : price > 0
                      ? `ادفع ${formatCurrencyEgp(price)} وأرسل`
                      : "إرسال السؤال"}
              </Button>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors",
                    tab === item.key
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-card text-text hover:border-accent/40"
                  )}
                >
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </button>
              ))}
            </div>

            {listLoading ? (
              <SectionLoader />
            ) : questions.length > 0 ? (
              <div className="space-y-3">
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    expanded={expandedId === question.id}
                    onToggle={() =>
                      setExpandedId((id) => (id === question.id ? null : question.id))
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState title={empty.title} description={empty.hint} />
            )}

            {!listLoading && totalPages > 1 ? (
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
          </section>
        </>
      ) : null}
    </div>
  );
}
