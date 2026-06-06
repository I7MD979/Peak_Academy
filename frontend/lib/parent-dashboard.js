/** ثوابت ومساعدات لوحة ولي الأمر */

export const PARENT_DASHBOARD_QUICK_ACTIONS = [
  {
    href: "/parent/report",
    label: "التقرير التفصيلي",
    icon: "book",
    tone: "border-peak-orange/30 bg-peak-orange/10 text-peak-orange"
  },
  {
    href: "/parent/profile",
    label: "ملفي الشخصي",
    icon: "user",
    tone: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
  }
];

export function resolveParentFirstName(parentName) {
  return parentName?.split(/\s+/)?.[0] || "ولي الأمر";
}

export function buildParentReportHref(studentId) {
  if (!studentId) return "/parent/report";
  return `/parent/report?student=${encodeURIComponent(studentId)}`;
}

export function patchParentDashboardUrl(searchParams, patch) {
  const params = new URLSearchParams(searchParams.toString());
  Object.entries(patch).forEach(([key, value]) => {
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `/parent/dashboard?${qs}` : "/parent/dashboard";
}

export function resolveSelectedChildId({ children = [], urlStudent, apiSelectedId }) {
  if (urlStudent && children.some((child) => child.id === urlStudent)) return urlStudent;
  if (apiSelectedId && children.some((child) => child.id === apiSelectedId)) return apiSelectedId;
  return children[0]?.id || "";
}
