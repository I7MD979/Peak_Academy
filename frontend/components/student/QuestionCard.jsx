"use client";

import { Button } from "@/components/ui/button";
import { formatDateTimeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function QuestionCard({ question, expanded, onToggle }) {
  const isAnswered = question?.status === "answered";

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent-blue/10 px-2.5 py-1 text-xs font-bold text-accent-blue">
              {question?.subject_label || "مادة"}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold",
                isAnswered ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}
            >
              {question?.status_label || (isAnswered ? "تم الرد" : "بانتظار الرد")}
            </span>
          </div>
          <p className={cn("mt-2 text-sm text-text", !expanded && "line-clamp-2")}>{question?.content}</p>
          <p className="mt-2 text-xs text-text-muted">{formatDateTimeAr(question?.created_at)}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-xl" onClick={onToggle}>
          {expanded ? "إخفاء" : "التفاصيل"}
        </Button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {isAnswered && question?.answer ? (
            <div className="rounded-xl bg-success/5 p-3">
              <p className="text-xs font-bold text-success">رد المدرس</p>
              {question.teacher_name ? (
                <p className="mt-1 text-xs text-text-muted">{question.teacher_name}</p>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-text">{question.answer}</p>
              {question.answered_at ? (
                <p className="mt-2 text-xs text-text-muted">
                  {formatDateTimeAr(question.answered_at)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
              سؤالك قيد المراجعة. سيصلك الرد من أحد مدرسين المادة قريباً.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}
