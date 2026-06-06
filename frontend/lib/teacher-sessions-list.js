/** ثوابت ومساعدات صفحة جلسات المعلم */

export const TEACHER_SESSION_STATUS_TABS = [
  { key: "all", label: "الكل" },
  { key: "scheduled", label: "قادمة" },
  { key: "live", label: "مباشرة الآن" },
  { key: "completed", label: "منتهية" },
  { key: "cancelled", label: "ملغاة" }
];

export const TEACHER_SESSION_STATUS_KEYS = new Set(
  TEACHER_SESSION_STATUS_TABS.map((tab) => tab.key)
);

export const TEACHER_SESSION_EMPTY_COPY = {
  all: {
    title: "لا توجد جلسات بعد",
    hint: "أنشئ جلسة جديدة لتظهر هنا للمتابعة والإدارة."
  },
  scheduled: {
    title: "لا توجد جلسات قادمة",
    hint: "جدول جلسة جديدة أو غيّر الفلتر."
  },
  live: {
    title: "لا توجد جلسات مباشرة الآن",
    hint: "عند بدء جلسة مجدولة ستظهر هنا للدخول فوراً."
  },
  completed: {
    title: "لا توجد جلسات منتهية",
    hint: "بعد إنهاء جلساتك ستظهر في هذا القسم."
  },
  cancelled: {
    title: "لا توجد جلسات ملغاة",
    hint: "الجلسات التي تلغيها ستُسجّل هنا."
  }
};

export function readTeacherSessionParam(searchParams, key, fallback = "") {
  return searchParams.get(key) ?? fallback;
}

export function readTeacherSessionPage(searchParams) {
  const raw = Number(searchParams.get("page") || "1");
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(100, Math.floor(raw));
}

export function resolveTeacherSessionStatus(searchParams) {
  const raw = readTeacherSessionParam(searchParams, "status", "all");
  return TEACHER_SESSION_STATUS_KEYS.has(raw) ? raw : "all";
}

export function buildTeacherSessionsApiQuery({ status, page, search, limit = "12" }) {
  const params = new URLSearchParams({
    status,
    page: String(page),
    limit
  });
  if (search) params.set("search", search);
  return params.toString();
}

export function patchTeacherSessionsUrl(searchParams, patch, { resetPage = false } = {}) {
  const params = new URLSearchParams(searchParams.toString());

  const apply = (key, value, defaultValue) => {
    if (value === defaultValue || value === "" || value === null || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  };

  Object.entries(patch).forEach(([key, value]) => {
    if (key === "status") apply("status", value, "all");
    else if (key === "page") apply("page", value, "1");
    else if (value === "" || value == null) params.delete(key);
    else params.set(key, String(value));
  });

  if (resetPage) params.delete("page");

  const qs = params.toString();
  return qs ? `/teacher/sessions?${qs}` : "/teacher/sessions";
}

export function resolveTeacherOpenSessionsCount(tabCounts = {}) {
  return (tabCounts.live ?? 0) + (tabCounts.scheduled ?? 0);
}
