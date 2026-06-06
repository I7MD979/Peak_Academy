"use client";

import Link from "next/link";
import ParentSubjectProgressBar from "@/components/parent/ParentSubjectProgressBar";
import { parentCardSolid, parentSectionTitle } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentDashboardSubjects({ subjects = [], reportHref = "/parent/report" }) {
  if (!subjects.length) return null;

  return (
    <section className={cn(parentCardSolid, "space-y-4 p-5 md:p-6")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={parentSectionTitle}>ملخص المواد</h3>
        <Link href={reportHref} className="text-sm font-bold text-peak-orange hover:underline">
          عرض الكل
        </Link>
      </div>
      {subjects.slice(0, 5).map((subject) => (
        <ParentSubjectProgressBar
          key={subject.key}
          label={subject.label}
          value={subject.progress}
          completed={subject.completed}
          total={subject.total}
        />
      ))}
    </section>
  );
}
