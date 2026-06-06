/** ثوابت ومساعدات صفحة جلسات الطالب */

export const STUDENT_SESSION_TABS = [
  { key: "available", label: "متاحة للحجز" },
  { key: "mine", label: "جلساتي" },
  { key: "live", label: "مباشرة الآن" },
  { key: "completed", label: "منتهية" }
];

export const STUDENT_SESSION_TAB_KEYS = new Set(STUDENT_SESSION_TABS.map((tab) => tab.key));

export const STUDENT_SESSION_SCHOOL_LEVEL_OPTIONS = [
  { value: "", label: "جميع المراحل" },
  { value: "preparatory", label: "إعدادي" },
  { value: "secondary", label: "ثانوي" }
];

export const STUDENT_SESSION_MAX_PRICE_OPTIONS = [
  { value: "", label: "أي سعر" },
  { value: "25", label: "حتى 25 جنيه" },
  { value: "50", label: "حتى 50 جنيه" },
  { value: "100", label: "حتى 100 جنيه" },
  { value: "200", label: "حتى 200 جنيه" }
];

export const STUDENT_SESSION_EMPTY_COPY = {
  available: {
    title: "لا توجد جلسات متاحة حالياً",
    hint: "جرّب إلغاء فلتر صفك أو توسيع نطاق التاريخ."
  },
  mine: {
    title: "لم تسجّل في أي جلسة بعد",
    hint: "تصفّح الجلسات المتاحة واحجز جلستك الأولى."
  },
  live: {
    title: "لا توجد جلسات مباشرة الآن",
    hint: "عند بدء مدرسك الجلسة ستظهر هنا للدخول فوراً."
  },
  completed: {
    title: "لا توجد جلسات منتهية",
    hint: "بعد إكمال جلساتك المسجّل فيها ستظهر في هذا القسم."
  }
};

export function readStudentSessionParam(searchParams, key, fallback = "") {
  return searchParams.get(key) ?? fallback;
}

export function readStudentSessionPage(searchParams) {
  const raw = Number(searchParams.get("page") || "1");
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(100, Math.floor(raw));
}

export function resolveStudentSessionTab(searchParams) {
  const raw = readStudentSessionParam(searchParams, "tab", "available");
  return STUDENT_SESSION_TAB_KEYS.has(raw) ? raw : "available";
}

export function buildStudentSessionsApiQuery({
  tab,
  page,
  urlSearch,
  onlyMyGrade,
  schoolLevel,
  subject,
  maxPrice,
  dateFrom,
  dateTo,
  limit = "12"
}) {
  const params = new URLSearchParams({
    tab,
    page: String(page),
    limit,
    only_my_grade: onlyMyGrade ? "true" : "false"
  });
  if (urlSearch) params.set("search", urlSearch);
  if (schoolLevel) params.set("school_level", schoolLevel);
  if (subject) params.set("subject", subject);
  if (maxPrice) params.set("max_price", maxPrice);
  if (dateFrom) params.set("from", dateFrom);
  if (dateTo) params.set("to", dateTo);
  return params.toString();
}

export function patchStudentSessionsUrl(searchParams, patch, { resetPage = false } = {}) {
  const params = new URLSearchParams(searchParams.toString());

  const apply = (key, value, defaultValue) => {
    if (value === defaultValue || value === "" || value === null || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  };

  Object.entries(patch).forEach(([key, value]) => {
    if (key === "tab") apply("tab", value, "available");
    else if (key === "page") apply("page", value, "1");
    else if (key === "only_my_grade") apply("only_my_grade", value ? "true" : "false", "true");
    else if (value === "" || value == null) params.delete(key);
    else params.set(key, String(value));
  });

  if (resetPage) params.delete("page");

  const qs = params.toString();
  return qs ? `/student/sessions?${qs}` : "/student/sessions";
}
