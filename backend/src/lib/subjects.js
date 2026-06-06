/** تسميات المواد بالعربية — مفاتيح الجلسات */
export const SUBJECT_LABELS_AR = {
  math: "رياضيات",
  physics: "فيزياء",
  chemistry: "كيمياء",
  biology: "أحياء",
  arabic: "لغة عربية",
  english: "لغة إنجليزية",
  history: "تاريخ",
  geography: "جغرافيا",
  general: "عام"
};

export function formatSubjectLabelAr(subject) {
  const key = String(subject || "")
    .trim()
    .toLowerCase();
  if (!key) return "أخرى";
  return SUBJECT_LABELS_AR[key] || subject;
}
