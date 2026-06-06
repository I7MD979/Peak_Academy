"use client";

import ParentSubjectProgressBar from "@/components/parent/ParentSubjectProgressBar";
import { parentCardSolid, parentMuted, parentSectionTitle } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentReportSubjects({ subjects = [] }) {
  return (
    <section className={cn(parentCardSolid, "space-y-5 p-5 md:p-6")}>
      <h2 className={parentSectionTitle}>الأداء حسب المادة</h2>
      {subjects.length > 0 ? (
        <div className="space-y-5">
          {subjects.map((subject) => (
            <ParentSubjectProgressBar
              key={subject.key}
              label={subject.label}
              value={subject.progress}
              completed={subject.completed}
              total={subject.total}
            />
          ))}
        </div>
      ) : (
        <p className={cn("text-sm", parentMuted)}>لا توجد جلسات مسجّلة في هذه الفترة لحساب هذا الطالب.</p>
      )}
    </section>
  );
}
