"use client";

import { Controller } from "react-hook-form";
import AuthField from "@/components/auth/AuthField";
import { Select } from "@/components/ui/Select";
import { SCHOOL_LEVEL_OPTIONS } from "@/lib/student-grade-form";
import { cn } from "@/lib/utils";

export default function StudentAcademicFields({
  control,
  errors = {},
  schoolLevel,
  gradeOptions,
  onSchoolLevelSelect
}) {
  return (
    <>
      <AuthField id="school_level" label="المرحلة الدراسية" error={errors.school_level?.message}>
        <Controller
          name="school_level"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-3">
              {SCHOOL_LEVEL_OPTIONS.map((level) => {
                const selected = field.value === level.value;
                return (
                  <label
                    key={level.value}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 p-3 transition",
                      selected
                        ? "border-primary-container bg-primary-container/10 shadow-sm"
                        : "border-outline-variant bg-surface-container hover:border-primary-container/40"
                    )}
                  >
                    <input
                      type="radio"
                      value={level.value}
                      checked={selected}
                      className="sr-only"
                      onChange={() => {
                        field.onChange(level.value);
                        onSchoolLevelSelect?.(level.value);
                      }}
                    />
                    <span className="block text-sm font-bold text-on-surface">{level.label}</span>
                    <span className="mt-1 block text-[11px] leading-snug text-on-surface-variant">
                      {level.description}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        />
      </AuthField>

      <AuthField id="grade" label="الصف الدراسي" error={errors.grade?.message}>
        <Controller
          name="grade"
          control={control}
          render={({ field }) => (
            <Select
              id="grade"
              variant="dark"
              placeholder={schoolLevel ? "اختر الصف الدراسي" : "اختر المرحلة أولاً"}
              options={gradeOptions}
              showError={false}
              disabled={!schoolLevel}
              {...field}
            />
          )}
        />
      </AuthField>
    </>
  );
}
