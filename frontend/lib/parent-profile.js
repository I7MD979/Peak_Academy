/** ثوابت ومساعدات صفحة ملف ولي الأمر */

export const PARENT_PROFILE_SECTION_TABS = [
  { key: "all", label: "الكل" },
  { key: "personal", label: "البيانات الشخصية" },
  { key: "children", label: "أبنائي" },
  { key: "link", label: "ربط طالب" },
  { key: "security", label: "الأمان" }
];

export const PARENT_PROFILE_SECTION_KEYS = new Set(
  PARENT_PROFILE_SECTION_TABS.map((tab) => tab.key)
);

export function readParentProfileParam(searchParams, key, fallback = "") {
  return searchParams.get(key) ?? fallback;
}

export function resolveParentProfileSection(searchParams) {
  const raw = readParentProfileParam(searchParams, "section", "all");
  return PARENT_PROFILE_SECTION_KEYS.has(raw) ? raw : "all";
}

export function patchParentProfileUrl(searchParams, patch) {
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
  return qs ? `/parent/profile?${qs}` : "/parent/profile";
}

export function resolveParentProfileStudentId({ linkedChildren = [], urlStudent, currentId }) {
  if (urlStudent && linkedChildren.some((child) => child.id === urlStudent)) return urlStudent;
  if (currentId && linkedChildren.some((child) => child.id === currentId)) return currentId;
  return linkedChildren[0]?.id || "";
}

export function buildParentChildReportHref(studentId) {
  if (!studentId) return "/parent/report";
  return `/parent/report?student=${encodeURIComponent(studentId)}`;
}
