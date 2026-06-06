"use client";

import { formatDateAr } from "@/lib/format";
import { teacherCardSolid, teacherMuted } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherProfileReviewsSection({ reviewsData }) {
  if (!reviewsData?.reviews?.length) return null;

  return (
    <section className={cn(teacherCardSolid, "space-y-3 p-5 md:p-6")}>
      <h2 className="text-lg font-black text-auth-on-surface">آخر التقييمات</h2>
      <ul className="space-y-3">
        {reviewsData.reviews.map((review) => (
          <li
            key={review.id}
            className="rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low p-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-auth-on-surface">{review.student_name}</span>
              <span className="text-amber-400">{"★".repeat(review.rating)}</span>
            </div>
            {review.comment ? (
              <p className={cn("mt-2", teacherMuted)}>{review.comment}</p>
            ) : null}
            <p className="mt-1 text-xs text-auth-on-surface-variant">{formatDateAr(review.created_at)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
