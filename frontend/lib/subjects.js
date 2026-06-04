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

export function getSubjectLabel(key) {
  return SUBJECT_OPTIONS.find((s) => s.key === key)?.label || key;
}
