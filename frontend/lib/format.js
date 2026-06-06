export function formatCurrencyEgp(amount) {
  const value = Number(amount || 0);
  return `${value.toLocaleString("ar-EG")} جنيه`;
}

export function formatDateTimeAr(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-EG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDateAr(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function formatRelativeTimeAr(value) {
  if (!value) return "—";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes.toLocaleString("ar-EG")} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours.toLocaleString("ar-EG")} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days.toLocaleString("ar-EG")} يوم`;
  return formatDateAr(value);
}

export const GRADE_LABELS_AR = {
  first: "الأول الثانوي",
  second: "الثاني الثانوي",
  third: "الثالث الثانوي",
  prep_first: "الأول الإعدادي",
  prep_second: "الثاني الإعدادي",
  prep_third: "الثالث الإعدادي",
  sec_first: "الأول الثانوي",
  sec_second: "الثاني الثانوي",
  sec_third: "الثالث الثانوي"
};

export function formatSchoolLevelAr(level) {
  if (level === "preparatory" || level === "prep") return "إعدادي";
  if (level === "secondary" || level === "sec") return "ثانوي";
  return level || "—";
}

export function formatGradeAr(grade) {
  return GRADE_LABELS_AR[grade] || grade || "—";
}

const withdrawalMethodLabels = {
  vodafone_cash: "فودافون كاش",
  vodafone: "فودافون كاش",
  instapay: "إنستاباي",
  bank: "تحويل بنكي",
  bank_transfer: "تحويل بنكي"
};

export function formatWithdrawalMethod(method) {
  if (!method) return "—";
  const key = String(method).toLowerCase().replace(/\s+/g, "_");
  return withdrawalMethodLabels[key] || method;
}
