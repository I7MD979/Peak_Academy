const ROLE_LABELS = {
  admin: "مشرف",
  teacher: "مدرس",
  student: "طالب",
  parent: "ولي أمر"
};

const ROLE_PANEL_LABELS = {
  admin: "لوحة الإدارة",
  teacher: "لوحة المعلم",
  student: "لوحة الطالب",
  parent: "لوحة ولي الأمر"
};

const ROUTES = {
  admin: [
    { prefix: "/admin/dashboard", title: "لوحة التحكم", subtitle: "نظرة عامة على المنصة" },
    { prefix: "/admin/profile", title: "حسابي", subtitle: "إعدادات المشرف" },
    { prefix: "/admin/users", title: "المستخدمين", subtitle: "إدارة حسابات المنصة" },
    { prefix: "/admin/sessions", title: "الجلسات", subtitle: "متابعة الجلسات والحالات" },
    { prefix: "/admin/withdrawals", title: "طلبات السحب", subtitle: "مراجعة ومعالجة الطلبات" },
    { prefix: "/admin/reports", title: "التقارير", subtitle: "إحصائيات وتحليلات مالية" }
  ],
  teacher: [
    { prefix: "/teacher/dashboard", title: "لوحتي", subtitle: "ملخص يومك التعليمي" },
    { prefix: "/teacher/sessions/new", title: "جلسة جديدة", subtitle: "إنشاء جلسة للطلاب" },
    { prefix: "/teacher/sessions", title: "جلساتي", subtitle: "إدارة الجلسات والبث" },
    { prefix: "/teacher/live", title: "جلسة مباشرة", subtitle: "غرفة البث المباشر" },
    { prefix: "/teacher/earnings", title: "أرباحي", subtitle: "الأرباح وطلبات السحب" },
    { prefix: "/teacher/profile", title: "ملفي الشخصي", subtitle: "بياناتك المهنية" }
  ],
  student: [
    { prefix: "/student/dashboard", title: "الرئيسية", subtitle: "تابع تقدمك اليومي" },
    { prefix: "/student/sessions", title: "الجلسات", subtitle: "جلساتك القادمة والمتاحة" },
    { prefix: "/student/study-rooms", title: "غرف المذاكرة", subtitle: "ذاكر مع زملائك" },
    { prefix: "/student/ask", title: "اسأل مدرس", subtitle: "اطرح سؤالك واحصل على إجابة" },
    { prefix: "/student/profile", title: "حسابي", subtitle: "إعدادات حسابك" },
    { prefix: "/student/live", title: "جلسة مباشرة", subtitle: "انضم للجلسة الآن" }
  ],
  parent: [
    { prefix: "/parent/dashboard", title: "الرئيسية", subtitle: "متابعة أبنائك" },
    { prefix: "/parent/profile", title: "حسابي", subtitle: "إعدادات ولي الأمر" },
    { prefix: "/parent/report", title: "التقرير", subtitle: "تقرير الأداء الأسبوعي" }
  ]
};

const PROFILE_HREF = {
  admin: "/admin/profile",
  teacher: "/teacher/profile",
  student: "/student/profile",
  parent: "/parent/profile"
};

const HOME_HREF = {
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  parent: "/parent/dashboard"
};

export function getTopbarMeta(pathname = "", role = "admin") {
  const routes = ROUTES[role] || [];
  const sorted = [...routes].sort((a, b) => b.prefix.length - a.prefix.length);
  const match = sorted.find((route) => pathname.startsWith(route.prefix));

  return {
    title: match?.title || ROLE_PANEL_LABELS[role] || "Peak Academy",
    subtitle: match?.subtitle || "",
    roleLabel: ROLE_LABELS[role] || role,
    panelLabel: ROLE_PANEL_LABELS[role] || "Peak Academy",
    profileHref: PROFILE_HREF[role] || "/",
    homeHref: HOME_HREF[role] || "/"
  };
}
