"use client";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Icon from "@/components/shared/Icon";
import { Select } from "@/components/ui/Select";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import {
  teacherBtnPrimary,
  teacherBtnSecondary,
  teacherCardSolid,
  teacherErrorBox,
  teacherInput,
  teacherSectionTitle
} from "@/lib/teacher-styles";
import { formatCurrencyEgp, formatDateTimeAr, formatGradeAr, formatSchoolLevelAr } from "@/lib/format";
import { cn } from "@/lib/utils";

const SCHOOL_LEVEL_OPTIONS = [
  { value: "preparatory", label: "إعدادي" },
  { value: "secondary", label: "ثانوي" }
];

const DURATION_OPTIONS = [
  { value: "30", label: "30 دقيقة" },
  { value: "45", label: "45 دقيقة" },
  { value: "60", label: "60 دقيقة" },
  { value: "90", label: "90 دقيقة" },
  { value: "120", label: "120 دقيقة" },
  { value: "180", label: "180 دقيقة" },
  { value: "240", label: "240 دقيقة" }
];

function FieldLabel({ children, required }) {
  return (
    <span className="text-xs font-bold text-auth-on-surface-variant">
      {children}
      {required ? <span className="text-danger"> *</span> : null}
    </span>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs font-semibold text-danger">{message}</p>;
}

export default function TeacherCreateSessionPage({
  form,
  fieldErrors = {},
  loading = false,
  gradeOptions = [],
  subjectOptions = [],
  subjectMode = "",
  customSubject = "",
  minDate = "",
  onFieldChange,
  onSubjectModeChange,
  onCustomSubjectChange,
  onSubmit,
  onCancel
}) {
  const previewSubject =
    subjectMode === "custom"
      ? customSubject.trim() || "المادة"
      : subjectOptions.find((o) => o.value === subjectMode)?.label || "المادة";

  const scheduledPreview = form.scheduled_at
    ? formatDateTimeAr(new Date(form.scheduled_at).toISOString())
    : "—";

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="لوحة المعلم · جلساتي"
        title="إنشاء جلسة تعليمية"
        subtitle="أدخل تفاصيل الجلسة بدقة — العنوان، المادة، الموعد، والسعر — لتظهر بشكل احترافي للطلاب في المنصة."
        actions={[
          { label: "لوحة المعلم", icon: "dashboard", href: "/teacher/dashboard", variant: "secondary" },
          { label: "جلساتي", icon: "calendarDays", href: "/teacher/sessions", variant: "secondary" }
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <form onSubmit={onSubmit} className={cn(teacherCardSolid, "space-y-6 p-6 md:p-8")} noValidate>
            <h2 className={teacherSectionTitle}>بيانات الجلسة</h2>

            <div className="space-y-2">
              <FieldLabel required>عنوان الجلسة</FieldLabel>
              <input
                type="text"
                value={form.title}
                onChange={onFieldChange("title")}
                placeholder="مثال: مراجعة نهائية — كيمياء عضوية"
                maxLength={200}
                className={cn(teacherInput, fieldErrors.title && "border-danger focus:border-danger focus:ring-danger/30")}
                aria-invalid={Boolean(fieldErrors.title)}
              />
              <FieldError message={fieldErrors.title} />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Select
                  variant="dark"
                  label="المادة"
                  value={subjectMode}
                  onChange={(e) => onSubjectModeChange?.(e.target.value)}
                  options={subjectOptions}
                  error={fieldErrors.subject}
                  aria-label="المادة"
                />
                {subjectMode === "custom" ? (
                  <input
                    type="text"
                    value={customSubject}
                    onChange={onCustomSubjectChange}
                    placeholder="اكتب اسم المادة"
                    maxLength={100}
                    className={cn(
                      teacherInput,
                      fieldErrors.subject && "border-danger focus:border-danger focus:ring-danger/30"
                    )}
                  />
                ) : null}
                <FieldError message={fieldErrors.subject} />
              </div>

              <div className="space-y-2">
                <Select
                  variant="dark"
                  label="المرحلة الدراسية"
                  value={form.school_level}
                  onChange={onFieldChange("school_level")}
                  options={SCHOOL_LEVEL_OPTIONS}
                  aria-label="المرحلة الدراسية"
                />
              </div>

              <div className="space-y-2">
                <Select
                  variant="dark"
                  label="الصف"
                  value={form.grade}
                  onChange={onFieldChange("grade")}
                  options={gradeOptions}
                  error={fieldErrors.grade}
                  aria-label="الصف"
                />
                <FieldError message={fieldErrors.grade} />
              </div>

              <div className="space-y-2">
                <Select
                  variant="dark"
                  label="مدة الجلسة"
                  value={String(form.duration_min)}
                  onChange={onFieldChange("duration_min")}
                  options={DURATION_OPTIONS}
                  error={fieldErrors.duration_min}
                  aria-label="مدة الجلسة"
                />
                <FieldError message={fieldErrors.duration_min} />
              </div>

              <div className="space-y-2">
                <FieldLabel required>السعر للطالب (جنيه)</FieldLabel>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.price}
                  onChange={onFieldChange("price")}
                  placeholder="0"
                  className={cn(teacherInput, fieldErrors.price && "border-danger focus:border-danger focus:ring-danger/30")}
                />
                <FieldError message={fieldErrors.price} />
              </div>

              <div className="space-y-2">
                <FieldLabel required>الحد الأقصى للطلاب</FieldLabel>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={form.max_students}
                  onChange={onFieldChange("max_students")}
                  className={cn(
                    teacherInput,
                    fieldErrors.max_students && "border-danger focus:border-danger focus:ring-danger/30"
                  )}
                />
                <FieldError message={fieldErrors.max_students} />
              </div>
            </div>

            <div className="space-y-2">
              <DateTimePicker
                variant="dark"
                label="موعد الجلسة"
                value={form.scheduled_at}
                onChange={onFieldChange("scheduled_at")}
                min={minDate}
                error={fieldErrors.scheduled_at}
                placeholder="اختر التاريخ والوقت"
              />
              <p className="text-xs text-auth-on-surface-variant">يجب أن يكون الموعد بعد 5 دقائق على الأقل من الآن.</p>
            </div>

            <div className="space-y-2">
              <FieldLabel>وصف مختصر (اختياري)</FieldLabel>
              <textarea
                rows={4}
                value={form.description}
                onChange={onFieldChange("description")}
                placeholder="اكتب نبذة عن محتوى الجلسة وأهدافها..."
                maxLength={2000}
                className={cn(teacherInput, "min-h-[120px] resize-y py-3")}
              />
              <FieldError message={fieldErrors.description} />
            </div>

            {fieldErrors._form ? <div className={teacherErrorBox}>{fieldErrors._form}</div> : null}

            <div className="flex flex-col gap-3 border-t border-auth-outline-variant/20 pt-6 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className={cn(teacherBtnPrimary, "flex-1 py-3.5 disabled:opacity-60")}
              >
                {loading ? "جاري الإنشاء…" : "إنشاء الجلسة"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onCancel}
                className={cn(teacherBtnSecondary, "sm:px-10")}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <h2 className="flex items-center gap-2 px-1 text-sm font-bold text-auth-on-surface-variant">
              <Icon name="visibility" size={18} className="text-peak-orange" />
              معاينة للطلاب
            </h2>

            <div className={cn(teacherCardSolid, "overflow-hidden")}>
              <div className="flex h-32 items-center justify-center bg-auth-surface-low">
                <Icon name="video" size={48} className="text-auth-on-surface-variant/25" />
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-bold text-peak-orange">{previewSubject}</p>
                  <p className="mt-1 text-lg font-black text-auth-on-surface">
                    {form.title.trim() || "عنوان الجلسة يظهر هنا"}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3 border-y border-auth-outline-variant/20 py-4 text-xs">
                  <div>
                    <dt className="text-auth-on-surface-variant">المدة</dt>
                    <dd className="mt-0.5 font-bold text-auth-on-surface">{form.duration_min} دقيقة</dd>
                  </div>
                  <div>
                    <dt className="text-auth-on-surface-variant">الطلاب</dt>
                    <dd className="mt-0.5 font-bold text-auth-on-surface">حتى {form.max_students}</dd>
                  </div>
                  <div>
                    <dt className="text-auth-on-surface-variant">المرحلة</dt>
                    <dd className="mt-0.5 font-bold text-auth-on-surface">
                      {formatSchoolLevelAr(form.school_level)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-auth-on-surface-variant">الصف</dt>
                    <dd className="mt-0.5 font-bold text-auth-on-surface">{formatGradeAr(form.grade)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-auth-on-surface-variant">الموعد</dt>
                    <dd className="mt-0.5 font-bold text-auth-on-surface">{scheduledPreview}</dd>
                  </div>
                </dl>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-auth-on-surface-variant">سعر الجلسة للطالب</p>
                    <p className="text-xl font-black text-peak-orange">
                      {form.price ? formatCurrencyEgp(Number(form.price)) : formatCurrencyEgp(0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-peak-orange/30 border-r-4 border-r-peak-orange bg-peak-orange/5 p-5">
              <h3 className="text-xs font-black uppercase tracking-wide text-peak-orange">نصائح لجلسة ناجحة</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-auth-on-surface-variant">
                <li className="flex gap-2">
                  <span className="text-success">✓</span>
                  استخدم عنواناً واضحاً يوضح موضوع الحصة
                </li>
                <li className="flex gap-2">
                  <span className="text-success">✓</span>
                  حدّد سعراً مناسباً لمرحلتك الدراسية
                </li>
                <li className="flex gap-2">
                  <span className="text-success">✓</span>
                  أضف وصفاً يساعد الطالب على فهم محتوى الجلسة
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
