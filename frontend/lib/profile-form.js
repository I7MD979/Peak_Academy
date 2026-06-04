export const GRADE_OPTIONS = [
  { value: "first", label: "الأول الثانوي" },
  { value: "second", label: "الثاني الثانوي" },
  { value: "third", label: "الثالث الثانوي" }
];

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
  }
  if (phone && phone.length < 8) {
    errors.phone = "رقم الهاتف غير صالح";
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
