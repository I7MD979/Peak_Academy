/** ثوابت ومساعدات ملف الطالب */

export const STUDENT_PROFILE_SECTION_TABS = [
  { key: "all", label: "الكل" },
  { key: "personal", label: "البيانات الشخصية" },
  { key: "academic", label: "البيانات الدراسية" },
  { key: "security", label: "الأمان" }
];

export const STUDENT_PROFILE_SECTION_KEYS = new Set(
  STUDENT_PROFILE_SECTION_TABS.map((tab) => tab.key)
);

export function resolveStudentProfileSection(searchParams) {
  const raw = searchParams.get("section") || "all";
  return STUDENT_PROFILE_SECTION_KEYS.has(raw) ? raw : "all";
}

export function patchStudentProfileUrl(searchParams, patch) {
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
  return qs ? `/student/profile?${qs}` : "/student/profile";
}
