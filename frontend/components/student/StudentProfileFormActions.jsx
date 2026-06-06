"use client";

import { studentBtnPrimary, studentBtnSecondary } from "@/lib/student-styles";
import { cn } from "@/lib/utils";

export default function StudentProfileFormActions({ saving = false, onReset }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={saving} className={cn(studentBtnPrimary, "px-8 py-3")}>
        {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
      </button>
      <button type="button" disabled={saving} onClick={onReset} className={studentBtnSecondary}>
        تراجع
      </button>
    </div>
  );
}
