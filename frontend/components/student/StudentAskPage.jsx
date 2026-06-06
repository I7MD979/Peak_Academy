"use client";

import Link from "next/link";
import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import StatsCard from "@/components/admin/StatsCard";
import QuestionCard from "@/components/student/QuestionCard";
import EmptyState from "@/components/shared/EmptyState";
import { SectionLoader, StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { Select } from "@/components/ui/Select";
import {
  studentBtnPrimary,
  studentBtnSecondary,
  studentCardSolid,
  studentErrorBox,
  studentInput,
  studentMuted
} from "@/lib/student-styles";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function StudentAskPage({
  gradeLabel = "",
  stats = {},
  subjects = [],
  subjectOptions = [],
  filterSubjectOptions = [],
  selectedSubject = "",
  onSelectedSubjectChange,
  content = "",
  onContentChange,
  contentLength = 0,
  price = 0,
  isFree = true,
  pendingPayment = null,
  onSubmitFree,
  onSubmitPaid,
  submitting = false,
  paying = false,
  tab = "all",
  tabs = [],
  onTabChange,
  listSubject = "",
  onListSubjectChange,
  dateFrom = "",
  onDateFromChange,
  dateTo = "",
  onDateToChange,
  onPageChange,
  onClearListFilters,
  questions = [],
  expandedId = null,
  onToggleQuestion,
  page = 1,
  totalPages = 1,
  totalCount = 0,
  loading = false,
  listLoading = false,
  refreshing = false,
  error = "",
  profileIncomplete = false,
  onRefresh,
  emptyTitle = "",
  emptyHint = ""
}) {
  const hasListFilters = Boolean(listSubject) || Boolean(dateFrom) || Boolean(dateTo);
  const tabsWithBadges = tabs.map((item) => {
    let badge;
    if (item.key === "all") badge = stats.total;
    else if (item.key === "unanswered") badge = stats.unanswered;
    else if (item.key === "answered") badge = stats.answered;
    return { ...item, badge: badge > 0 ? badge : undefined };
  });

  if (loading && !gradeLabel && !error && !profileIncomplete) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري تحميل صفحة الأسئلة..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="اسأل مدرس"
        title="اطرح سؤالك"
        subtitle={
          gradeLabel
            ? `أسئلة مخصصة لـ ${gradeLabel} — يراجعها مدرس متخصص ويرد عليك`
            : "أكمل صفك الدراسي لإرسال الأسئلة"
        }
        actions={[
          {
            label: refreshing || loading ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || loading
          },
          {
            label: "لوحتي",
            icon: "dashboard",
            variant: "secondary",
            href: "/student/dashboard"
          }
        ]}
      />

      {profileIncomplete ? (
        <section className={cn(studentCardSolid, "flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}>
          <div>
            <p className="font-black text-auth-on-surface">أكمل ملفك الدراسي</p>
            <p className={cn("mt-1 text-sm", studentMuted)}>حدّد صفك الدراسي لإرسال الأسئلة للمدرسين.</p>
          </div>
          <Link href="/student/profile" className={studentBtnPrimary}>
            إكمال الملف
          </Link>
        </section>
      ) : null}

      {error ? (
        <div className={studentErrorBox}>
          <p>{error}</p>
          {onRefresh ? (
            <button type="button" className="mt-2 text-sm font-bold text-peak-orange underline" onClick={onRefresh}>
              إعادة المحاولة
            </button>
          ) : null}
        </div>
      ) : null}

      {!profileIncomplete && !error ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatsCard
                  variant="dark"
                  title="إجمالي الأسئلة"
                  value={(stats.total ?? 0).toLocaleString("ar-EG")}
                  iconName="help"
                  tone="blue"
                />
                <StatsCard
                  variant="dark"
                  title="تم الرد"
                  value={(stats.answered ?? 0).toLocaleString("ar-EG")}
                  iconName="check"
                  tone="success"
                />
                <StatsCard
                  variant="dark"
                  title="بانتظار الرد"
                  value={(stats.unanswered ?? 0).toLocaleString("ar-EG")}
                  iconName="bell"
                  tone="warning"
                />
              </>
            )}
          </section>

          <section className={cn(studentCardSolid, "space-y-5 p-5 md:p-6")}>
            <div>
              <h2 className="text-lg font-black text-auth-on-surface">سؤال جديد</h2>
              <p className={cn("mt-1 text-sm", studentMuted)}>اختر المادة واكتب سؤالك بوضوح (10 أحرف على الأقل).</p>
            </div>

            <Select
              variant="dark"
              label="المادة"
              value={selectedSubject}
              onChange={(e) => onSelectedSubjectChange?.(e.target.value)}
              options={subjectOptions}
              disabled={submitting || paying}
              aria-label="اختر المادة"
            />

            <div className="space-y-1.5">
              <label htmlFor="question_content" className="text-xs font-bold text-auth-on-surface-variant">
                نص السؤال
              </label>
              <textarea
                id="question_content"
                rows={6}
                maxLength={2000}
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                disabled={submitting || paying}
                placeholder="اكتب سؤالك بالتفصيل…"
                className={cn(studentInput, "min-h-[140px] resize-y py-3")}
              />
              <p className={cn("text-xs", studentMuted)}>{contentLength}/2000</p>
            </div>

            <div className="flex flex-col gap-3 border-t border-auth-outline-variant/30 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className={cn("text-sm", studentMuted)}>
                {isFree ? (
                  "هذا السؤال مجاني لصفك."
                ) : (
                  <>
                    تكلفة السؤال:{" "}
                    <span className="font-bold text-peak-orange">{formatCurrencyEgp(price)}</span>
                    {pendingPayment ? " — أكمل الدفع لإرسال السؤال." : ""}
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {isFree || price <= 0 ? (
                  <button
                    type="button"
                    onClick={onSubmitFree}
                    disabled={submitting || paying || contentLength < 10}
                    className={cn(studentBtnPrimary, "px-8")}
                  >
                    {submitting ? "جاري الإرسال…" : "إرسال السؤال"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSubmitPaid}
                    disabled={submitting || paying || contentLength < 10}
                    className={cn(studentBtnPrimary, "px-8")}
                  >
                    {paying ? (
                      <>
                        <Icon name="refresh" size={18} className="animate-spin" />
                        جاري التحويل للدفع…
                      </>
                    ) : (
                      <>
                        <Icon name="wallet" size={18} />
                        ادفع وأرسل ({formatCurrencyEgp(price)})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-auth-on-surface">أسئلتي السابقة</h2>

            <AdminFilterTabs tabs={tabsWithBadges} value={tab} onChange={onTabChange} />

            <div className={cn(studentCardSolid, "grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4")}>
              <Select
                variant="dark"
                label="فلتر المادة"
                value={listSubject}
                onChange={(e) => onListSubjectChange?.(e.target.value)}
                options={filterSubjectOptions}
                disabled={listLoading}
                aria-label="فلتر المادة في القائمة"
              />
              <CustomDatePicker
                variant="dark"
                label="من تاريخ"
                value={dateFrom}
                onChange={(e) => onDateFromChange?.(e.target.value)}
                disabled={listLoading}
                placeholder="تاريخ البداية"
              />
              <CustomDatePicker
                variant="dark"
                label="إلى تاريخ"
                value={dateTo}
                onChange={(e) => onDateToChange?.(e.target.value)}
                disabled={listLoading}
                placeholder="تاريخ النهاية"
              />
              {hasListFilters ? (
                <div className="flex items-end">
                  <button type="button" onClick={onClearListFilters} className={cn(studentBtnSecondary, "w-full")}>
                    مسح الفلاتر
                  </button>
                </div>
              ) : null}
            </div>

            {listLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-auth-surface-low" />
                ))}
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-3">
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    expanded={expandedId === question.id}
                    onToggle={() => onToggleQuestion?.(question.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title={emptyTitle} hint={emptyHint} />
            )}

            {!listLoading && totalPages > 1 ? (
              <AdminPagination
                page={page}
                totalPages={totalPages}
                totalLabel={`${totalCount.toLocaleString("ar-EG")} سؤال`}
                loading={listLoading}
                onPrev={() => onPageChange?.(page - 1)}
                onNext={() => onPageChange?.(page + 1)}
              />
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
