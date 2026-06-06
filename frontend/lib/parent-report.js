/** ثوابت ومساعدات صفحة تقرير ولي الأمر */

export const PARENT_REPORT_PERIODS = [
  { value: "month", label: "آخر 30 يوماً" },
  { value: "week", label: "آخر 7 أيام" },
  { value: "custom", label: "فترة مخصصة" }
];

export const PARENT_REPORT_PERIOD_KEYS = new Set(PARENT_REPORT_PERIODS.map((item) => item.value));

export const PARENT_REPORT_PERIOD_LABELS = {
  month: "آخر 30 يوماً",
  week: "آخر 7 أيام",
  custom: "فترة مخصصة"
};

export function readParentReportParam(searchParams, key, fallback = "") {
  return searchParams.get(key) ?? fallback;
}

export function resolveParentReportPeriod(searchParams) {
  const raw = readParentReportParam(searchParams, "period", "month");
  return PARENT_REPORT_PERIOD_KEYS.has(raw) ? raw : "month";
}

export function patchParentReportUrl(searchParams, patch) {
  const params = new URLSearchParams(searchParams.toString());

  Object.entries(patch).forEach(([key, value]) => {
    if (key === "period") {
      if (!value || value === "month") params.delete("period");
      else params.set("period", String(value));
      return;
    }
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
  });

  const qs = params.toString();
  return qs ? `/parent/report?${qs}` : "/parent/report";
}

export function getParentReportSessionsTitle(period) {
  if (period === "week") return "جلسات الأسبوع";
  if (period === "custom") return "جلسات الفترة";
  return "جلسات الشهر";
}

export function resolveParentReportStudentId({ linkedChildren = [], urlStudent, currentId }) {
  if (urlStudent && linkedChildren.some((child) => child.id === urlStudent)) return urlStudent;
  if (currentId && linkedChildren.some((child) => child.id === currentId)) return currentId;
  return linkedChildren[0]?.id || "";
}
