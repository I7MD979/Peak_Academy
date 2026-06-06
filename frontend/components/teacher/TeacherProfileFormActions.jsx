"use client";

import { teacherBtnPrimary, teacherBtnSecondary } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherProfileFormActions({ saving = false, onReset }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={saving} className={cn(teacherBtnPrimary, "px-8 py-3")}>
        {saving ? "جاري الحفظ…" : "حفظ التعديلات"}
      </button>
      <button type="button" disabled={saving} onClick={onReset} className={teacherBtnSecondary}>
        تراجع
      </button>
    </div>
  );
}
