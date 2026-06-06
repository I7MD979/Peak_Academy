"use client";

import { parentCardSolid, parentMuted } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentDashboardStudentHero({ student }) {
  if (!student) return null;

  const initial = student.full_name?.charAt(0) || "ط";

  return (
    <section className={cn(parentCardSolid, "p-5 md:p-6")}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-peak-orange/15 text-2xl font-black text-peak-orange">
          {student.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div>
          <h2 className="text-xl font-black text-auth-on-surface">{student.full_name}</h2>
          <p className={cn("text-sm", parentMuted)}>
            {student.grade_label || "—"}
            {student.section ? ` · شعبة ${student.section}` : ""}
          </p>
          <p className="mt-1 text-sm font-semibold text-peak-orange">
            ستريك المذاكرة: {(student.streak_days ?? 0).toLocaleString("ar-EG")} يوم
          </p>
        </div>
      </div>
    </section>
  );
}
