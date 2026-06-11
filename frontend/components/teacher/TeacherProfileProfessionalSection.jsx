"use client";

import { Select } from "@/components/ui/Select";
import { TEACHER_EXPERIENCE_OPTIONS } from "@/lib/teacher-profile";
import { teacherCardSolid, teacherInput, teacherMuted } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherProfileProfessionalSection({
  form,
  fieldErrors = {},
  subjectsPreview = [],
  gradeOptions = [],
  subjectQuickOptions = [],
  saving = false,
  onChange,
  onToggleGrade,
  onAddSubject
}) {
  return (
    <section className={cn(teacherCardSolid, "space-y-4 p-5 md:p-6")}>
      <div>
        <h2 className="text-lg font-black text-auth-on-surface">البيانات المهنية</h2>
        <p className={cn("mt-1 text-sm", teacherMuted)}>عرّف نفسك للطلاب وحدد المواد والصفوف التي تدرّسها.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <span className="text-xs font-bold text-auth-on-surface-variant">الصفوف التي تدرّسها</span>
          <div className="flex flex-wrap gap-2">
            {gradeOptions.map((grade) => (
              <button
                key={grade.value}
                type="button"
                disabled={saving}
                onClick={() => onToggleGrade?.(grade.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  form.grades?.includes(grade.value)
                    ? "bg-peak-orange text-white shadow-md shadow-peak-orange/20"
                    : "border border-auth-outline-variant/40 bg-auth-surface-low text-auth-on-surface-variant hover:border-peak-orange/40"
                )}
              >
                {grade.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            variant="dark"
            label="سنوات الخبرة"
            value={form.experience_years}
            onChange={onChange?.("experience_years")}
            options={TEACHER_EXPERIENCE_OPTIONS}
            disabled={saving}
            aria-label="سنوات الخبرة"
          />
          <div className="space-y-1.5">
            <label htmlFor="education" className="text-xs font-bold text-auth-on-surface-variant">
              المؤهل العلمي
            </label>
            <input
              id="education"
              value={form.education}
              onChange={onChange?.("education")}
              placeholder="بكالوريوس علوم — جامعة القاهرة"
              disabled={saving}
              maxLength={200}
              className={teacherInput}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="social_url" className="text-xs font-bold text-auth-on-surface-variant">
            رابط يوتيوب / فيسبوك (اختياري)
          </label>
          <input
            id="social_url"
            dir="ltr"
            value={form.social_url}
            onChange={onChange?.("social_url")}
            placeholder="https://"
            disabled={saving}
            maxLength={500}
            className={cn(teacherInput, "text-start", fieldErrors.social_url && "border-danger")}
          />
          {fieldErrors.social_url ? (
            <p className="text-xs text-danger">{fieldErrors.social_url}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="subjects_text" className="text-xs font-bold text-auth-on-surface-variant">
            المواد التي تدرّسها
          </label>
          <div className="flex flex-wrap gap-2">
            {subjectQuickOptions.map((subject) => (
              <button
                key={subject.value}
                type="button"
                disabled={saving}
                onClick={() => onAddSubject?.(subject.label, subject.value)}
                className="rounded-full border border-auth-outline-variant/40 bg-auth-surface-low px-3 py-1 text-xs font-bold text-auth-on-surface-variant transition-colors hover:border-peak-orange/40 hover:text-peak-orange"
              >
                + {subject.label}
              </button>
            ))}
          </div>
          <input
            id="subjects_text"
            value={form.subjects_text}
            onChange={onChange?.("subjects_text")}
            placeholder="كيمياء، فيزياء، رياضيات"
            disabled={saving}
            className={cn(
              teacherInput,
              fieldErrors.subjects_text && "border-danger focus:border-danger focus:ring-danger/30"
            )}
          />
          {fieldErrors.subjects_text ? (
            <p className="text-xs text-danger">{fieldErrors.subjects_text}</p>
          ) : (
            <p className={cn("text-xs", teacherMuted)}>افصل بين المواد بفاصلة عربية أو إنجليزية</p>
          )}
          {subjectsPreview.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {subjectsPreview.map((subject) => (
                <span
                  key={subject}
                  className="rounded-full bg-peak-orange/15 px-3 py-1 text-xs font-bold text-peak-orange"
                >
                  {subject}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bio" className="text-xs font-bold text-auth-on-surface-variant">
            نبذة مهنية
          </label>
          <textarea
            id="bio"
            rows={5}
            value={form.bio}
            onChange={onChange?.("bio")}
            maxLength={1000}
            disabled={saving}
            className={cn(teacherInput, "min-h-[120px] resize-y py-3")}
            placeholder="اكتب خبرتك، أسلوبك في الشرح، وما يميزك كمدرس..."
          />
          <p className={cn("text-xs", teacherMuted)}>{form.bio.length}/1000</p>
          {fieldErrors.bio ? <p className="text-xs text-danger">{fieldErrors.bio}</p> : null}
        </div>
      </div>
    </section>
  );
}
