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

const SUBJECT_ALIASES = {
  عربي: "arabic",
  إنجليزي: "english",
  انجليزي: "english",
  عام: "general"
};

const LABEL_TO_KEY = Object.fromEntries(
  Object.entries(SUBJECT_LABELS_AR).map(([key, label]) => [label, key])
);

/** Normalize teacher subject values to canonical keys (math, physics, …). */
export function normalizeTeacherSubjectKeys(values) {
  const keys = [];

  for (const raw of values || []) {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) continue;

    const lowered = text.toLowerCase();
    let key = SUBJECT_LABELS_AR[lowered] ? lowered : "";

    if (!key) key = LABEL_TO_KEY[text] || LABEL_TO_KEY[lowered] || "";
    if (!key) key = SUBJECT_ALIASES[text] || SUBJECT_ALIASES[lowered] || "";

    if (key && !keys.includes(key)) keys.push(key);
  }

  return keys;
}
