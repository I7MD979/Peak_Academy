/** ثوابت ومساعدات ملف المعلم */

export const TEACHER_PROFILE_SECTION_TABS = [
  { key: "all", label: "الكل" },
  { key: "personal", label: "البيانات الأساسية" },
  { key: "professional", label: "البيانات المهنية" },
  { key: "reviews", label: "التقييمات" },
  { key: "security", label: "الأمان" }
];

export const TEACHER_PROFILE_SECTION_KEYS = new Set(
  TEACHER_PROFILE_SECTION_TABS.map((tab) => tab.key)
);

export function resolveTeacherProfileSection(searchParams) {
  const raw = searchParams.get("section") || "all";
  return TEACHER_PROFILE_SECTION_KEYS.has(raw) ? raw : "all";
}

export function patchTeacherProfileUrl(searchParams, patch) {
  const params = new URLSearchParams(searchParams.toString());

  Object.entries(patch).forEach(([key, value]) => {
    if (key === "section") {
      if (!value || value === "all") params.delete("section");
      else params.set("section", String(value));
      return;
    }
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
  });

  const qs = params.toString();
  return qs ? `/teacher/profile?${qs}` : "/teacher/profile";
}

export const TEACHER_EXPERIENCE_OPTIONS = [
  { value: "", label: "—" },
  ...Array.from({ length: 41 }, (_, i) => ({ value: String(i), label: `${i} ${i === 0 ? "سنة" : "سنوات"}` }))
];
