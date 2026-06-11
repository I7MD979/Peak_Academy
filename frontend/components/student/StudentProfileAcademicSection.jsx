"use client";

import ProfileSectionCard from "@/components/profile/ProfileSectionCard";
import { Select } from "@/components/ui/Select";
import { studentInput, studentMuted } from "@/lib/student-styles";
import { formatGradeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function StudentProfileAcademicSection({
  form,
  fieldErrors = {},
  gradeOptions = [],
  saving = false,
  onChange
}) {
  return (
    <ProfileSectionCard
      variant="student"
      title="البيانات الدراسية"
      description="تُستخدم لتصفية الجلسات وغرف المذاكرة حسب صفك."
      icon="school"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          variant="dark"
          label="الصف الدراسي *"
          value={form.grade}
          onChange={onChange?.("grade")}
          options={[{ value: "", label: "— اختر صفك —" }, ...gradeOptions]}
          disabled={saving}
          error={fieldErrors.grade}
          aria-label="الصف الدراسي"
        />
        <div className="space-y-1.5">
          <label htmlFor="section" className="text-xs font-bold text-auth-on-surface-variant">
            الشعبة (اختياري)
          </label>
          <input
            id="section"
            value={form.section}
            onChange={onChange?.("section")}
            placeholder="مثال: أ، ب، علمي"
            disabled={saving}
            maxLength={50}
            className={cn(
              studentInput,
              fieldErrors.section && "border-danger focus:border-danger focus:ring-danger/30"
            )}
          />
          {fieldErrors.section ? (
            <p className="text-xs text-danger">{fieldErrors.section}</p>
          ) : null}
        </div>
      </div>

      {form.grade ? (
        <p className={cn("text-xs", studentMuted)}>
          الصف المحدد: <span className="font-bold text-auth-on-surface">{formatGradeAr(form.grade)}</span>
        </p>
      ) : null}
    </ProfileSectionCard>
  );
}
