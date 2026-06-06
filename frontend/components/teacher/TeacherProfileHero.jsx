"use client";

import Icon from "@/components/shared/Icon";
import { teacherCardSolid } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

function RatingBadge({ value, count, verified }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-400">
        <Icon name="star" size={16} />
        {Number(value || 0).toFixed(1)}
        {count != null ? (
          <span className="text-xs font-semibold text-amber-400/80">
            ({Number(count).toLocaleString("ar-EG")} تقييم)
          </span>
        ) : null}
      </span>
      {verified ? (
        <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">موثّق</span>
      ) : (
        <span className="rounded-full bg-auth-surface-low px-3 py-1 text-xs font-bold text-auth-on-surface-variant">
          قيد التوثيق
        </span>
      )}
    </div>
  );
}

export default function TeacherProfileHero({ profile, form, reviewsData }) {
  if (!profile) return null;

  const teacherProfile = profile.teacher_profile;
  const avgRating = reviewsData?.average_rating ?? teacherProfile?.rating;
  const reviewCount = reviewsData?.total_count ?? teacherProfile?.review_count ?? 0;

  return (
    <div className={cn(teacherCardSolid, "flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between")}>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-peak-orange/15 text-2xl font-black text-peak-orange">
          {form.avatar_url || profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.avatar_url || profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            (form.full_name || profile.full_name || "?").slice(0, 1)
          )}
        </div>
        <div>
          <p className="text-lg font-black text-auth-on-surface">{form.full_name || profile.full_name}</p>
          <p className="text-sm text-auth-on-surface-variant" dir="ltr">
            {profile.email}
          </p>
        </div>
      </div>
      <RatingBadge value={avgRating} count={reviewCount} verified={teacherProfile?.id_verified} />
    </div>
  );
}
