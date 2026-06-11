export const SUBJECT_OPTIONS = [
  { key: "math", label: "رياضيات" },
  { key: "physics", label: "فيزياء" },
  { key: "chemistry", label: "كيمياء" },
  { key: "biology", label: "أحياء" },
  { key: "arabic", label: "لغة عربية" },
  { key: "english", label: "لغة إنجليزية" },
  { key: "history", label: "تاريخ" },
  { key: "geography", label: "جغرافيا" }
];

const SUBJECT_ALIASES = {
  عربي: "arabic",
  إنجليزي: "english",
  انجليزي: "english",
  عام: "general"
};

export function getSubjectLabel(key) {
  return SUBJECT_OPTIONS.find((s) => s.key === key)?.label || key;
}

/** Map a stored key, Arabic label, or alias to a canonical subject key. */
export function resolveSubjectKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const lowered = raw.toLowerCase();
  const byKey = SUBJECT_OPTIONS.find((subject) => subject.key === lowered);
  if (byKey) return byKey.key;

  const byLabel = SUBJECT_OPTIONS.find(
    (subject) => subject.label === raw || subject.label.toLowerCase() === lowered
  );
  if (byLabel) return byLabel.key;

  return SUBJECT_ALIASES[raw] || SUBJECT_ALIASES[lowered] || "";
}

export function normalizeSubjectKeys(values) {
  const keys = [];
  for (const value of values || []) {
    const key = resolveSubjectKey(value);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

export function formatSubjectDisplay(value) {
  const key = resolveSubjectKey(value);
  return key ? getSubjectLabel(key) : String(value || "").trim();
}
