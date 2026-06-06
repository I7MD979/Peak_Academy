"use client";

import Link from "next/link";
import Icon from "@/components/shared/Icon";
import { resolveTeacherFirstName } from "@/lib/teacher-dashboard";
import { teacherBtnPrimary, teacherCardSolid, teacherMuted } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherDashboardWelcome({ profile }) {
  const firstName = resolveTeacherFirstName(profile);

  return (
    <section className={cn(teacherCardSolid, "relative overflow-hidden p-6 md:p-8")}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-peak-orange/10 to-transparent" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-peak-orange/15 text-2xl font-black text-peak-orange">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              firstName.slice(0, 1)
            )}
          </div>
          <div>
            <p className="text-lg font-black text-auth-on-surface">{profile?.full_name || "المعلم"}</p>
            <p className={cn("text-sm", teacherMuted)}>
              {profile?.subject_label || profile?.specialization || "معلم Peak Academy"}
              {profile?.grade_labels?.length ? ` — ${profile.grade_labels.join("، ")}` : null}
            </p>
          </div>
        </div>

        <Link href="/teacher/sessions/new" className={cn(teacherBtnPrimary, "justify-center")}>
          <Icon name="plus" size={18} />
          إنشاء جلسة جديدة
        </Link>
      </div>
    </section>
  );
}
