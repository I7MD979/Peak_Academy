export const GRADE_OPTIONS = [
  { value: "first", label: "الأول الثانوي" },
  { value: "second", label: "الثاني الثانوي" },
  { value: "third", label: "الثالث الثانوي" }
];

/** All grades for teacher/student profile (prep + secondary). */
export const TEACHER_GRADE_OPTIONS = [
  { value: "prep_first", label: "الأول الإعدادي" },
  { value: "prep_second", label: "الثاني الإعدادي" },
  { value: "prep_third", label: "الثالث الإعدادي" },
  { value: "sec_first", label: "الأول الثانوي" },
  { value: "sec_second", label: "الثاني الثانوي" },
  { value: "sec_third", label: "الثالث الثانوي" }
];

export const STUDENT_GRADE_OPTIONS = TEACHER_GRADE_OPTIONS;

const LEGACY_GRADE_MAP = {
  first: "sec_first",
  second: "sec_second",
  third: "sec_third"
};

export function normalizeStudentGrade(grade) {
  if (!grade) return "";
  return LEGACY_GRADE_MAP[grade] || grade;
}

export function parseSubjects(value) {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function subjectsToText(subjects) {
  return parseSubjects(subjects).join("، ");
}

export function validateBaseProfile(form) {
  const errors = {};
  const fullName = String(form.full_name || "").trim();
  const phone = String(form.phone || "").trim();
  const avatarUrl = String(form.avatar_url || "").trim();

  if (!fullName || fullName.length < 2) {
    errors.full_name = "الاسم يجب أن يكون حرفين على الأقل";
  } else if (fullName.length > 80) {
    errors.full_name = "الاسم طويل جداً (80 حرفاً كحد أقصى)";
  }
  if (phone && phone.length < 8) {
    errors.phone = "رقم الهاتف غير صالح";
  } else if (phone && phone.length > 20) {
    errors.phone = "رقم الهاتف طويل جداً";
  }
  if (avatarUrl && !/^https?:\/\/.+/i.test(avatarUrl)) {
    errors.avatar_url = "أدخل رابط صورة يبدأ بـ http أو https";
  }
  return errors;
}

export function formatJoinDateAr(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export const ROLE_LABELS_AR = {
  admin: "مشرف النظام",
  teacher: "مدرس",
  student: "طالب",
  parent: "ولي أمر"
};
