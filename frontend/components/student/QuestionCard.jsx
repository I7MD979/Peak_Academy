"use client";

import { formatDateTimeAr } from "@/lib/format";
import { studentBtnSecondary } from "@/lib/student-styles";
import { cn } from "@/lib/utils";

export default function QuestionCard({ question, expanded, onToggle }) {
  const isAnswered = question?.status === "answered";

  return (
    <article className="rounded-2xl border border-auth-outline-variant/40 bg-auth-surface-low p-4 transition-all hover:border-peak-orange/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent-blue/15 px-2.5 py-1 text-xs font-bold text-accent-blue">
              {question?.subject_label || "مادة"}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold",
                isAnswered ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              )}
            >
              {question?.status_label || (isAnswered ? "تم الرد" : "بانتظار الرد")}
            </span>
          </div>
          <p className={cn("mt-2 text-sm text-auth-on-surface", !expanded && "line-clamp-2")}>
            {question?.content}
          </p>
          <p className="mt-2 text-xs text-auth-on-surface-variant">{formatDateTimeAr(question?.created_at)}</p>
        </div>
        <button
          type="button"
          className={cn(studentBtnSecondary, "shrink-0 px-3 py-1.5 text-xs")}
          onClick={onToggle}
        >
          {expanded ? "إخفاء" : "التفاصيل"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3 border-t border-auth-outline-variant/30 pt-4">
          {isAnswered && question?.answer ? (
            <div className="rounded-xl border border-success/30 bg-success/10 p-3">
              <p className="text-xs font-bold text-success">رد المدرس</p>
              {question.teacher_name ? (
                <p className="mt-1 text-xs text-auth-on-surface-variant">{question.teacher_name}</p>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-auth-on-surface">{question.answer}</p>
              {question.answered_at ? (
                <p className="mt-2 text-xs text-auth-on-surface-variant">
                  {formatDateTimeAr(question.answered_at)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
              سؤالك قيد المراجعة. سيصلك الرد من أحد مدرسين المادة قريباً.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}
